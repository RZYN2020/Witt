use crate::anki as anki_service;
use crate::anki_notes;
use crate::app_config;
use crate::db;
use crate::models::*;
use crate::settings;
use crate::state::AppState;
use chrono::Utc;
use std::fs;
use witt_core::sync::{sync_annotations_to_anki as core_sync_annotations_to_anki, SyncInput};

#[tauri::command]
pub async fn sync_annotations_to_anki(
    state: tauri::State<'_, AppState>,
) -> Result<SyncSummary, String> {
    let (settings, deck_name, annotations) = {
        let conn = state.conn.lock().await;
        let settings =
            app_config::settings_from_config(&app_config::read_config(&state.config_path)?);
        db::save_settings(&conn, &settings)?;
        let deck_name =
            db::selected_deck(&conn)?.ok_or_else(|| "Select an Anki deck first".to_string())?;
        let annotations = db::list_annotations(&conn, None)?
            .into_iter()
            .filter(|annotation| annotation.status != "synced")
            .collect::<Vec<_>>();
        (settings, deck_name, annotations)
    };
    if annotations.is_empty() {
        return Ok(SyncSummary {
            created: 0,
            failed: Vec::new(),
            anki_web_sync: AnkiWebSyncState::NotRequested,
            anki_web_sync_error: None,
        });
    }
    let llm_api_key = if settings.anki_preprocess_mode == "llm" {
        settings::get_llm_api_key().ok()
    } else {
        None
    };
    let (summary, synced) = core_sync_annotations_to_anki(SyncInput {
        push_anki_web: settings.anki_auto_sync_web,
        settings: settings.clone(),
        deck_name: deck_name.clone(),
        annotations: annotations.clone(),
        llm_api_key,
    })
    .await?;
    let now = Utc::now().to_rfc3339();
    let conn = state.conn.lock().await;
    for (annotation_id, note_id) in synced {
        db::mark_annotation_synced(&conn, &annotation_id, note_id, &now)?;
    }
    Ok(summary)
}

#[tauri::command]
pub async fn sync_anki_web(state: tauri::State<'_, AppState>) -> Result<SyncSummary, String> {
    let settings = {
        let conn = state.conn.lock().await;
        let settings =
            app_config::settings_from_config(&app_config::read_config(&state.config_path)?);
        db::save_settings(&conn, &settings)?;
        settings
    };
    let mut summary = SyncSummary {
        created: 0,
        failed: Vec::new(),
        anki_web_sync: AnkiWebSyncState::NotRequested,
        anki_web_sync_error: None,
    };
    match anki_service::sync_anki_web(&settings.anki_endpoint).await {
        Ok(()) => summary.anki_web_sync = AnkiWebSyncState::Synced,
        Err(error) => {
            summary.anki_web_sync = AnkiWebSyncState::Failed;
            summary.anki_web_sync_error = Some(error);
        }
    }
    Ok(summary)
}

#[tauri::command]
pub async fn list_anki_sync_conflicts(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<AnkiSyncConflict>, String> {
    let conn = state.conn.lock().await;
    let selected = db::selected_deck(&conn)?;
    db::list_anki_sync_conflicts(&conn, selected.as_deref())
}

#[tauri::command]
pub async fn export_queued_annotations_tsv(
    state: tauri::State<'_, AppState>,
) -> Result<ExportSummary, String> {
    let (settings, annotations, export_dir) = {
        let conn = state.conn.lock().await;
        let settings =
            app_config::settings_from_config(&app_config::read_config(&state.config_path)?);
        db::save_settings(&conn, &settings)?;
        let annotations = db::list_annotations(&conn, None)?
            .into_iter()
            .filter(|annotation| annotation.status != "synced")
            .collect::<Vec<_>>();
        let app_dir = state
            .config_path
            .parent()
            .ok_or_else(|| "App data directory not found".to_string())?
            .join("exports");
        (settings, annotations, app_dir)
    };
    fs::create_dir_all(&export_dir).map_err(|error| error.to_string())?;
    let fields = [
        settings.anki_word_field.as_str(),
        settings.anki_sentence_field.as_str(),
        settings.anki_book_field.as_str(),
        settings.anki_chapter_field.as_str(),
        settings.anki_meaning_field.as_str(),
    ]
    .into_iter()
    .filter(|field| !field.trim().is_empty())
    .collect::<Vec<_>>();
    let mut lines = vec![fields.join("\t")];
    for annotation in &annotations {
        let values = anki_notes::export_fields(&settings, annotation);
        lines.push(
            fields
                .iter()
                .map(|field| escape_tsv(values.get(*field).map(String::as_str).unwrap_or_default()))
                .collect::<Vec<_>>()
                .join("\t"),
        );
    }
    let path = export_dir.join(format!(
        "witt-anki-export-{}.tsv",
        Utc::now().format("%Y%m%d-%H%M%S")
    ));
    fs::write(&path, lines.join("\n")).map_err(|error| error.to_string())?;
    Ok(ExportSummary {
        path: path.to_string_lossy().to_string(),
        exported: annotations.len(),
    })
}

#[tauri::command]
pub async fn check_anki(state: tauri::State<'_, AppState>) -> Result<AnkiStatus, String> {
    let endpoint = {
        let conn = state.conn.lock().await;
        let settings =
            app_config::settings_from_config(&app_config::read_config(&state.config_path)?);
        db::save_settings(&conn, &settings)?;
        settings.anki_endpoint
    };
    Ok(anki_service::check_anki(&endpoint).await)
}

fn escape_tsv(value: &str) -> String {
    value.replace(['\t', '\r'], " ").replace('\n', "<br>")
}

#[tauri::command]
pub async fn list_anki_decks(state: tauri::State<'_, AppState>) -> Result<Vec<AnkiDeck>, String> {
    let endpoint = {
        let conn = state.conn.lock().await;
        let settings =
            app_config::settings_from_config(&app_config::read_config(&state.config_path)?);
        db::save_settings(&conn, &settings)?;
        settings.anki_endpoint
    };
    if let Ok(remote_decks) = anki_service::fetch_decks(&endpoint).await {
        let conn = state.conn.lock().await;
        let selected = db::selected_deck(&conn)?;
        for name in remote_decks {
            db::upsert_deck(
                &conn,
                &AnkiDeck {
                    selected: selected.as_deref() == Some(name.as_str()),
                    name,
                    synced_at: None,
                },
            )?;
        }
    }
    let conn = state.conn.lock().await;
    db::list_decks(&conn)
}

#[tauri::command]
pub async fn list_anki_models(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<AnkiModelInfo>, String> {
    let endpoint = {
        let conn = state.conn.lock().await;
        let settings =
            app_config::settings_from_config(&app_config::read_config(&state.config_path)?);
        db::save_settings(&conn, &settings)?;
        settings.anki_endpoint
    };
    anki_service::fetch_models(&endpoint).await
}

#[tauri::command]
pub async fn select_anki_deck(
    state: tauri::State<'_, AppState>,
    deck_name: String,
) -> Result<(), String> {
    let conn = state.conn.lock().await;
    db::select_deck(&conn, &deck_name)
}

#[tauri::command]
pub async fn refresh_anki_cache(
    state: tauri::State<'_, AppState>,
    deck_name: String,
) -> Result<Vec<AnkiNote>, String> {
    let (endpoint, model_name) = {
        let conn = state.conn.lock().await;
        let settings =
            app_config::settings_from_config(&app_config::read_config(&state.config_path)?);
        db::save_settings(&conn, &settings)?;
        (settings.anki_endpoint, settings.anki_model_name)
    };
    let notes = anki_service::fetch_notes(&endpoint, &deck_name).await?;
    let synced_at = Utc::now().to_rfc3339();
    let mut conn = state.conn.lock().await;
    db::replace_anki_notes(&mut conn, &deck_name, &model_name, &notes, &synced_at)?;
    Ok(notes)
}

#[tauri::command]
pub async fn search_anki_notes(
    state: tauri::State<'_, AppState>,
    deck_name: Option<String>,
    query: Option<String>,
) -> Result<Vec<AnkiNote>, String> {
    let conn = state.conn.lock().await;
    let selected = if deck_name.is_none() {
        db::selected_deck(&conn)?
    } else {
        deck_name
    };
    db::search_anki_notes(&conn, selected.as_deref(), query.as_deref())
}

#[tauri::command]
pub async fn get_anki_note(
    state: tauri::State<'_, AppState>,
    note_id: i64,
) -> Result<Option<AnkiNote>, String> {
    let conn = state.conn.lock().await;
    db::get_anki_note(&conn, note_id)
}
