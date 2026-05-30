use crate::models::{
    AnkiModelInfo, AnkiNote, AnkiStatus, Annotation, AppSettings, SyncFailure, SyncSummary,
};
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};

pub const DEFAULT_MODEL_NAME: &str = "Witt EPUB Sentence";
pub const DEFAULT_ANKI_ENDPOINT: &str = "http://localhost:8765";

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
) -> Result<(SyncSummary, Vec<(String, i64)>), String> {
    let endpoint = &settings.anki_endpoint;
    ensure_deck(endpoint, deck_name).await?;
    if settings.anki_model_name == DEFAULT_MODEL_NAME {
        ensure_default_model(endpoint).await?;
    }
    let api_key = if settings.anki_preprocess_mode == "llm" {
        crate::settings::get_llm_api_key().ok()
    } else {
        None
    };
    let mut notes = Vec::new();
    for annotation in annotations {
        notes.push(
            crate::anki_notes::prepare_note(settings, api_key.as_deref(), deck_name, annotation)
                .await,
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
    Ok((SyncSummary { created, failed }, synced))
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
