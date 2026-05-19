use crate::models::*;
use crate::{anki, books, db, settings};
use chrono::Utc;
use rusqlite::Connection;
use std::path::PathBuf;
use tauri::Manager;
use tokio::sync::Mutex;
use uuid::Uuid;

pub struct AppState {
    pub conn: Mutex<Connection>,
    pub books_dir: PathBuf,
}

impl AppState {
    pub fn new(app: &tauri::AppHandle) -> Result<Self, String> {
        let app_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
        std::fs::create_dir_all(&app_dir).map_err(|error| error.to_string())?;
        let books_dir = app_dir.join("books");
        std::fs::create_dir_all(&books_dir).map_err(|error| error.to_string())?;
        let db_path = app_dir.join("witt.sqlite3");
        Ok(Self {
            conn: Mutex::new(db::open_database(&db_path)?),
            books_dir,
        })
    }
}

#[tauri::command]
pub async fn import_book(state: tauri::State<'_, AppState>, source_path: String) -> Result<Book, String> {
    let imported = books::import_book_file(&source_path, &state.books_dir)?;
    let conn = state.conn.lock().await;
    db::insert_book(&conn, &imported.book)?;
    Ok(imported.book)
}

#[tauri::command]
pub async fn list_books(state: tauri::State<'_, AppState>) -> Result<Vec<Book>, String> {
    let conn = state.conn.lock().await;
    db::list_books(&conn)
}

#[tauri::command]
pub async fn get_book(state: tauri::State<'_, AppState>, book_id: String) -> Result<Option<Book>, String> {
    let conn = state.conn.lock().await;
    db::get_book(&conn, &book_id)
}

#[tauri::command]
pub async fn remove_book(state: tauri::State<'_, AppState>, book_id: String) -> Result<(), String> {
    let book = {
        let conn = state.conn.lock().await;
        let book = db::get_book(&conn, &book_id)?;
        db::remove_book(&conn, &book_id)?;
        book
    };
    if let Some(book) = book {
        let _ = std::fs::remove_file(book.file_path);
    }
    Ok(())
}

#[tauri::command]
pub async fn get_book_file(state: tauri::State<'_, AppState>, book_id: String) -> Result<Vec<u8>, String> {
    let book = {
        let conn = state.conn.lock().await;
        db::get_book(&conn, &book_id)?.ok_or_else(|| "Book not found".to_string())?
    };
    books::read_book_bytes(&book.file_path)
}

#[tauri::command]
pub async fn save_progress(state: tauri::State<'_, AppState>, progress: ReadingProgress) -> Result<(), String> {
    let mut progress = progress;
    progress.updated_at = Utc::now().to_rfc3339();
    let conn = state.conn.lock().await;
    db::save_progress(&conn, &progress)
}

#[tauri::command]
pub async fn get_progress(state: tauri::State<'_, AppState>, book_id: String) -> Result<Option<ReadingProgress>, String> {
    let conn = state.conn.lock().await;
    db::get_progress(&conn, &book_id)
}

#[tauri::command]
pub async fn create_annotation(state: tauri::State<'_, AppState>, draft: AnnotationDraft) -> Result<Annotation, String> {
    let now = Utc::now().to_rfc3339();
    let annotation = Annotation {
        id: Uuid::new_v4().to_string(),
        book_id: draft.book_id,
        word: draft.word,
        sentence: draft.sentence,
        chapter_title: draft.chapter_title,
        epub_cfi: draft.epub_cfi,
        status: "queued".to_string(),
        anki_note_id: None,
        created_at: now.clone(),
        updated_at: now,
    };
    let conn = state.conn.lock().await;
    db::insert_annotation(&conn, &annotation)?;
    Ok(annotation)
}

#[tauri::command]
pub async fn list_annotations(state: tauri::State<'_, AppState>, book_id: Option<String>) -> Result<Vec<Annotation>, String> {
    let conn = state.conn.lock().await;
    db::list_annotations(&conn, book_id.as_deref())
}

#[tauri::command]
pub async fn sync_annotations_to_anki(state: tauri::State<'_, AppState>) -> Result<SyncSummary, String> {
    let (endpoint, deck_name, annotations) = {
        let conn = state.conn.lock().await;
        let settings = db::get_settings(&conn)?;
        let deck_name = db::selected_deck(&conn)?.ok_or_else(|| "Select an Anki deck first".to_string())?;
        let annotations = db::list_annotations(&conn, None)?
            .into_iter()
            .filter(|annotation| annotation.status != "synced")
            .collect::<Vec<_>>();
        (settings.anki_endpoint, deck_name, annotations)
    };
    if annotations.is_empty() {
        return Ok(SyncSummary {
            created: 0,
            failed: Vec::new(),
        });
    }
    let (summary, synced) = anki::sync_annotations(&endpoint, &deck_name, &annotations).await?;
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
        db::get_settings(&conn)?.anki_endpoint
    };
    Ok(anki::check_anki(&endpoint).await)
}

#[tauri::command]
pub async fn list_anki_decks(state: tauri::State<'_, AppState>) -> Result<Vec<AnkiDeck>, String> {
    let endpoint = {
        let conn = state.conn.lock().await;
        db::get_settings(&conn)?.anki_endpoint
    };
    if let Ok(remote_decks) = anki::fetch_decks(&endpoint).await {
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
pub async fn select_anki_deck(state: tauri::State<'_, AppState>, deck_name: String) -> Result<(), String> {
    let conn = state.conn.lock().await;
    db::select_deck(&conn, &deck_name)
}

#[tauri::command]
pub async fn refresh_anki_cache(state: tauri::State<'_, AppState>, deck_name: String) -> Result<Vec<AnkiNote>, String> {
    let endpoint = {
        let conn = state.conn.lock().await;
        db::get_settings(&conn)?.anki_endpoint
    };
    let notes = anki::fetch_notes(&endpoint, &deck_name).await?;
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
pub async fn get_anki_note(state: tauri::State<'_, AppState>, note_id: i64) -> Result<Option<AnkiNote>, String> {
    let conn = state.conn.lock().await;
    db::get_anki_note(&conn, note_id)
}

#[tauri::command]
pub async fn get_settings(state: tauri::State<'_, AppState>) -> Result<AppSettings, String> {
    let conn = state.conn.lock().await;
    db::get_settings(&conn)
}

#[tauri::command]
pub async fn save_settings(state: tauri::State<'_, AppState>, settings: AppSettings) -> Result<(), String> {
    let conn = state.conn.lock().await;
    db::save_settings(&conn, &settings)
}

#[tauri::command]
pub async fn save_llm_api_key(api_key: String) -> Result<(), String> {
    settings::save_llm_api_key(&api_key)
}

#[tauri::command]
pub async fn has_llm_api_key() -> Result<bool, String> {
    Ok(settings::has_llm_api_key())
}
