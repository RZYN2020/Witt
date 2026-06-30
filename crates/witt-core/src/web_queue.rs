use crate::models::{
    AnkiWebSyncState, AppSettings, SyncFailure, SyncSummary, WebQueueAnnotationJob,
    WebQueueJobResult, WebQueueProcessSummary,
};
use crate::sync::{sync_annotations_to_anki, SyncInput};
use reqwest::Client;

#[derive(Debug, Clone)]
pub struct WebQueueInput {
    pub settings: AppSettings,
    pub limit: usize,
    pub llm_api_key: Option<String>,
}

pub async fn process_queue(input: WebQueueInput) -> Result<WebQueueProcessSummary, String> {
    let client = Client::new();
    let jobs = claim_web_jobs(&client, &input.settings, input.limit).await?;
    let mut completed = 0;
    let mut failed = 0;
    let mut results = Vec::new();

    for job in jobs {
        let mut job_settings = job
            .settings
            .clone()
            .unwrap_or_else(|| input.settings.clone());
        job_settings.anki_endpoint = input.settings.anki_endpoint.clone();
        if job_settings.web_queue_endpoint.trim().is_empty() {
            job_settings.web_queue_endpoint = input.settings.web_queue_endpoint.clone();
        }
        if job_settings.web_queue_token.trim().is_empty() {
            job_settings.web_queue_token = input.settings.web_queue_token.clone();
        }

        let summary = sync_job(&job, job_settings, input.llm_api_key.clone()).await;
        if summary.created > 0
            && summary.failed.is_empty()
            && summary.anki_web_sync != AnkiWebSyncState::Failed
        {
            completed += 1;
        } else {
            failed += 1;
        }
        results.push(WebQueueJobResult {
            id: job.id.clone(),
            summary,
        });
    }

    let output = WebQueueProcessSummary {
        claimed: completed + failed,
        completed,
        failed,
        results,
    };
    report_web_jobs(&client, &input.settings, &output).await?;
    Ok(output)
}

async fn sync_job(
    job: &WebQueueAnnotationJob,
    settings: AppSettings,
    llm_api_key: Option<String>,
) -> SyncSummary {
    match sync_annotations_to_anki(SyncInput {
        push_anki_web: settings.anki_auto_sync_web,
        settings,
        deck_name: job.deck_name.clone(),
        annotations: vec![job.annotation.clone()],
        llm_api_key,
    })
    .await
    {
        Ok((summary, _synced)) => summary,
        Err(error) => SyncSummary {
            created: 0,
            failed: vec![SyncFailure {
                word: job.annotation.word.clone(),
                error,
            }],
            anki_web_sync: AnkiWebSyncState::NotRequested,
            anki_web_sync_error: None,
        },
    }
}

async fn claim_web_jobs(
    client: &Client,
    settings: &AppSettings,
    limit: usize,
) -> Result<Vec<WebQueueAnnotationJob>, String> {
    let url = web_queue_url(settings, "anki/jobs/claim");
    let mut request = client
        .post(url)
        .json(&serde_json::json!({ "limit": limit }));
    if !settings.web_queue_token.trim().is_empty() {
        request = request.bearer_auth(settings.web_queue_token.trim());
    }
    request
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json::<Vec<WebQueueAnnotationJob>>()
        .await
        .map_err(|error| error.to_string())
}

async fn report_web_jobs(
    client: &Client,
    settings: &AppSettings,
    summary: &WebQueueProcessSummary,
) -> Result<(), String> {
    let url = web_queue_url(settings, "anki/jobs/report");
    let mut request = client.post(url).json(summary);
    if !settings.web_queue_token.trim().is_empty() {
        request = request.bearer_auth(settings.web_queue_token.trim());
    }
    request
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?;
    Ok(())
}

fn web_queue_url(settings: &AppSettings, path: &str) -> String {
    format!(
        "{}/{}",
        settings.web_queue_endpoint.trim().trim_end_matches('/'),
        path.trim_start_matches('/')
    )
}

#[cfg(test)]
mod tests {
    use super::web_queue_url;
    use crate::models::AppSettings;

    #[test]
    fn builds_queue_urls_without_duplicate_slashes() {
        let settings = AppSettings {
            web_queue_endpoint: "https://example.test/api/".to_string(),
            ..AppSettings::default()
        };
        assert_eq!(
            web_queue_url(&settings, "/anki/jobs/claim"),
            "https://example.test/api/anki/jobs/claim"
        );
    }
}
