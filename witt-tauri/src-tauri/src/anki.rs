use crate::models::{AnkiNote, AnkiStatus, Annotation, SyncFailure, SyncSummary};
use chrono::Utc;
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};

const MODEL_NAME: &str = "Witt EPUB Sentence";
pub const DEFAULT_ANKI_ENDPOINT: &str = "http://localhost:8765";

#[derive(Debug, Deserialize)]
struct AnkiResponse<T> {
    result: Option<T>,
    error: Option<String>,
}

async fn request<T: for<'de> Deserialize<'de>>(endpoint: &str, action: &str, params: Value) -> Result<T, String> {
    let client = Client::new();
    let response = client
        .post(endpoint)
        .json(&json!({ "action": action, "version": 6, "params": params }))
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let payload = response
        .json::<AnkiResponse<T>>()
        .await
        .map_err(|error| error.to_string())?;
    if let Some(error) = payload.error {
        return Err(error);
    }
    payload.result.ok_or_else(|| "AnkiConnect returned no result".to_string())
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

pub async fn fetch_notes(endpoint: &str, deck_name: &str) -> Result<Vec<AnkiNote>, String> {
    let ids = request::<Vec<i64>>(endpoint, "findNotes", json!({ "query": format!("deck:\"{}\"", deck_name) })).await?;
    if ids.is_empty() {
        return Ok(Vec::new());
    }
    let notes = request::<Vec<Value>>(endpoint, "notesInfo", json!({ "notes": ids })).await?;
    let now = Utc::now().to_rfc3339();
    Ok(notes
        .into_iter()
        .filter_map(|note| parse_note(deck_name, &now, note))
        .collect())
}

pub async fn sync_annotations(endpoint: &str, deck_name: &str, annotations: &[Annotation]) -> Result<(SyncSummary, Vec<(String, i64)>), String> {
    ensure_deck(endpoint, deck_name).await?;
    ensure_model(endpoint).await?;
    let notes: Vec<Value> = annotations
        .iter()
        .map(|annotation| {
            json!({
                "deckName": deck_name,
                "modelName": MODEL_NAME,
                "fields": {
                    "Word": annotation.word,
                    "Sentence": annotation.sentence,
                    "Book": annotation.book_id,
                    "Chapter": annotation.chapter_title.clone().unwrap_or_default(),
                    "Meaning": ""
                },
                "tags": ["witt", "epub"],
                "options": { "allowDuplicate": false, "duplicateScope": "deck" }
            })
        })
        .collect();
    let results = request::<Vec<Option<i64>>>(endpoint, "addNotes", json!({ "notes": notes })).await?;
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

async fn ensure_model(endpoint: &str) -> Result<(), String> {
    let models = request::<Vec<String>>(endpoint, "modelNames", json!({})).await?;
    if models.iter().any(|name| name == MODEL_NAME) {
        return Ok(());
    }
    request::<Value>(
        endpoint,
        "createModel",
        json!({
            "modelName": MODEL_NAME,
            "inOrderFields": ["Word", "Sentence", "Book", "Chapter", "Meaning"],
            "css": ".card{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;font-size:20px;line-height:1.6}.word{font-size:32px;font-weight:700}.sentence{margin-top:18px}.meaning{margin-top:18px;color:#475569}",
            "cardTemplates": [{
                "Name": "Sentence",
                "Front": "<div class=\"word\">{{Word}}</div><div class=\"sentence\">{{Sentence}}</div>",
                "Back": "<div class=\"word\">{{Word}}</div><div class=\"sentence\">{{Sentence}}</div><div class=\"meaning\">{{Meaning}}</div><p>{{Book}} · {{Chapter}}</p>"
            }]
        }),
    )
    .await
    .map(|_| ())
}

fn parse_note(deck_name: &str, now: &str, value: Value) -> Option<AnkiNote> {
    let note_id = value.get("noteId")?.as_i64()?;
    let fields = value.get("fields")?.as_object()?;
    let field_value = |name: &str| -> Option<String> {
        fields
            .get(name)
            .and_then(|field| field.get("value"))
            .and_then(|value| value.as_str())
            .map(|s| strip_html(s.to_string()))
            .filter(|value: &String| !value.trim().is_empty())
    };
    // Try common word field names first, then fall back to the first non-empty field.
    let word = field_value("Word")
        .or_else(|| field_value("Lemma"))
        .or_else(|| field_value("Front"))
        .or_else(|| {
            fields
                .values()
                .find_map(|field| {
                    field
                        .get("value")
                        .and_then(|v| v.as_str())
                        .map(|s| strip_html(s.to_string()))
                        .filter(|s| !s.trim().is_empty())
                })
        })?;
    Some(AnkiNote {
        note_id,
        deck_name: deck_name.to_string(),
        word: word.to_lowercase(),
        sentence: field_value("Sentence"),
        meaning: field_value("Meaning").or_else(|| field_value("Definition")).or_else(|| field_value("Back")),
        raw_fields_json: serde_json::to_string(&fields).ok()?,
        updated_at: now.to_string(),
    })
}

fn strip_html(value: String) -> String {
    let mut output = String::new();
    let mut in_tag = false;
    for ch in value.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => output.push(ch),
            _ => {}
        }
    }
    output.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::strip_html;

    #[test]
    fn strips_basic_html() {
        assert_eq!(strip_html("<b>Hello</b>".to_string()), "Hello");
    }
}
