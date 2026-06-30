use crate::defaults::DEFAULT_MODEL_NAME;
use crate::models::{
    AnkiModelInfo, AnkiNote, AnkiStatus, AnkiWebSyncState, Annotation, AppSettings, SyncFailure,
    SyncSummary,
};
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};

pub struct AnkiConnectClient {
    endpoint: String,
}

impl AnkiConnectClient {
    pub fn new(endpoint: impl Into<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
        }
    }

    pub async fn check_anki(&self) -> AnkiStatus {
        check_anki(&self.endpoint).await
    }

    pub async fn fetch_decks(&self) -> Result<Vec<String>, String> {
        fetch_decks(&self.endpoint).await
    }

    pub async fn fetch_models(&self) -> Result<Vec<AnkiModelInfo>, String> {
        fetch_models(&self.endpoint).await
    }

    pub async fn fetch_notes(&self, deck_name: &str) -> Result<Vec<AnkiNote>, String> {
        fetch_notes(&self.endpoint, deck_name).await
    }

    pub async fn sync_annotations(
        &self,
        settings: &AppSettings,
        deck_name: &str,
        annotations: &[Annotation],
        llm_api_key: Option<&str>,
    ) -> Result<(SyncSummary, Vec<(String, i64)>), String> {
        sync_annotations(settings, deck_name, annotations, llm_api_key).await
    }

    pub async fn sync_anki_web(&self) -> Result<(), String> {
        sync_anki_web(&self.endpoint).await
    }
}

#[derive(Debug, Deserialize)]
struct AnkiResponse<T> {
    result: Option<T>,
    error: Option<String>,
}

async fn request<T: for<'de> Deserialize<'de>>(
    endpoint: &str,
    action: &str,
    params: Value,
) -> Result<T, String> {
    let client = Client::new();
    let response = client
        .post(endpoint)
        .json(&json!({ "action": action, "version": 6, "params": params }))
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!("AnkiConnect HTTP {status}"));
    }
    let payload = response
        .json::<AnkiResponse<T>>()
        .await
        .map_err(|error| error.to_string())?;
    if let Some(error) = payload.error {
        return Err(error);
    }
    payload
        .result
        .ok_or_else(|| "AnkiConnect returned no result".to_string())
}

async fn request_allowing_null(endpoint: &str, action: &str, params: Value) -> Result<(), String> {
    let client = Client::new();
    let response = client
        .post(endpoint)
        .json(&json!({ "action": action, "version": 6, "params": params }))
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let status = response.status();
    if !status.is_success() {
        return Err(format!("AnkiConnect HTTP {status}"));
    }
    let payload = response
        .json::<AnkiResponse<Value>>()
        .await
        .map_err(|error| error.to_string())?;
    if let Some(error) = payload.error {
        return Err(error);
    }
    Ok(())
}

pub async fn check_anki(endpoint: &str) -> AnkiStatus {
    match request::<i64>(endpoint, "version", json!({})).await {
        Ok(version) => AnkiStatus {
            available: true,
            version: Some(version),
        },
        Err(_) => AnkiStatus {
            available: false,
            version: None,
        },
    }
}

pub async fn fetch_decks(endpoint: &str) -> Result<Vec<String>, String> {
    request::<Vec<String>>(endpoint, "deckNames", json!({})).await
}

pub async fn fetch_models(endpoint: &str) -> Result<Vec<AnkiModelInfo>, String> {
    let names = request::<Vec<String>>(endpoint, "modelNames", json!({})).await?;
    let mut output = Vec::new();
    for name in names {
        let fields = request::<Vec<String>>(
            endpoint,
            "modelFieldNames",
            json!({ "modelName": name.clone() }),
        )
        .await?;
        output.push(AnkiModelInfo { name, fields });
    }
    Ok(output)
}

pub async fn fetch_notes(endpoint: &str, deck_name: &str) -> Result<Vec<AnkiNote>, String> {
    let ids = request::<Vec<i64>>(
        endpoint,
        "findNotes",
        json!({ "query": format!("deck:\"{}\"", escape_query_value(deck_name)) }),
    )
    .await?;
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let mut notes = Vec::new();
    for chunk in ids.chunks(200) {
        notes
            .extend(request::<Vec<Value>>(endpoint, "notesInfo", json!({ "notes": chunk })).await?);
    }
    Ok(crate::anki_notes::parse_notes(deck_name, notes))
}

pub async fn sync_annotations(
    settings: &AppSettings,
    deck_name: &str,
    annotations: &[Annotation],
    llm_api_key: Option<&str>,
) -> Result<(SyncSummary, Vec<(String, i64)>), String> {
    let endpoint = &settings.anki_endpoint;
    ensure_deck(endpoint, deck_name).await?;
    if settings.anki_model_name == DEFAULT_MODEL_NAME {
        ensure_default_model(endpoint).await?;
    }
    let mut notes = Vec::new();
    for annotation in annotations {
        notes.push(
            crate::anki_notes::prepare_note(settings, llm_api_key, deck_name, annotation).await,
        );
    }
    let results =
        request::<Vec<Option<i64>>>(endpoint, "addNotes", json!({ "notes": notes })).await?;
    let mut created = 0;
    let mut failed = Vec::new();
    let mut synced = Vec::new();
    for (index, result) in results.iter().enumerate() {
        if let Some(note_id) = result {
            created += 1;
            synced.push((annotations[index].id.clone(), *note_id));
        } else {
            failed.push(SyncFailure {
                word: annotations[index].word.clone(),
                error: "Duplicate or rejected by Anki".to_string(),
            });
        }
    }
    Ok((
        SyncSummary {
            created,
            failed,
            anki_web_sync: AnkiWebSyncState::NotRequested,
            anki_web_sync_error: None,
        },
        synced,
    ))
}

pub async fn sync_anki_web(endpoint: &str) -> Result<(), String> {
    request_allowing_null(endpoint, "sync", json!({})).await
}

async fn ensure_deck(endpoint: &str, deck_name: &str) -> Result<(), String> {
    request::<Value>(endpoint, "createDeck", json!({ "deck": deck_name }))
        .await
        .map(|_| ())
}

async fn ensure_default_model(endpoint: &str) -> Result<(), String> {
    let models = request::<Vec<String>>(endpoint, "modelNames", json!({})).await?;
    if models.iter().any(|name| name == DEFAULT_MODEL_NAME) {
        return Ok(());
    }
    request::<Value>(
        endpoint,
        "createModel",
        crate::anki_notes::default_model_payload(DEFAULT_MODEL_NAME),
    )
    .await
    .map(|_| ())
}

fn escape_query_value(value: &str) -> String {
    value.replace('\\', "\\\\").replace('"', "\\\"")
}
