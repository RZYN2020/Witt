use crate::anki_connect::{sync_anki_web, AnkiConnectClient};
use crate::models::{AnkiWebSyncState, Annotation, AppSettings, SyncSummary};

#[derive(Debug, Clone)]
pub struct SyncInput {
    pub settings: AppSettings,
    pub deck_name: String,
    pub annotations: Vec<Annotation>,
    pub llm_api_key: Option<String>,
    pub push_anki_web: bool,
}

pub async fn sync_annotations_to_anki(
    input: SyncInput,
) -> Result<(SyncSummary, Vec<(String, i64)>), String> {
    let client = AnkiConnectClient::new(input.settings.anki_endpoint.clone());
    let (mut summary, synced) = client
        .sync_annotations(
            &input.settings,
            &input.deck_name,
            &input.annotations,
            input.llm_api_key.as_deref(),
        )
        .await?;

    if input.push_anki_web && summary.created > 0 {
        match sync_anki_web(&input.settings.anki_endpoint).await {
            Ok(()) => summary.anki_web_sync = AnkiWebSyncState::Synced,
            Err(error) => {
                summary.anki_web_sync = AnkiWebSyncState::Failed;
                summary.anki_web_sync_error = Some(error);
            }
        }
    }

    Ok((summary, synced))
}
