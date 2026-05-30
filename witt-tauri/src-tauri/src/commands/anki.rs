use crate::anki as anki_service;
use crate::app_config;
use crate::db;
use crate::models::*;
use crate::state::AppState;
use chrono::Utc;

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
        });
    }
    let (summary, synced) =
        anki_service::sync_annotations(&settings, &deck_name, &annotations).await?;
    let now = Utc::now().to_rfc3339();
    let conn = state.conn.lock().await;
    for (annotation_id, note_id) in synced {
        db::mark_annotation_synced(&conn, &annotation_id, note_id, &now)?;
    }
    Ok(summary)
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
    let endpoint = {
        let conn = state.conn.lock().await;
        let settings =
            app_config::settings_from_config(&app_config::read_config(&state.config_path)?);
        db::save_settings(&conn, &settings)?;
        settings.anki_endpoint
    };
    let notes = anki_service::fetch_notes(&endpoint, &deck_name).await?;
    let synced_at = Utc::now().to_rfc3339();
    let mut conn = state.conn.lock().await;
    db::replace_anki_notes(&mut conn, &deck_name, &notes, &synced_at)?;
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
