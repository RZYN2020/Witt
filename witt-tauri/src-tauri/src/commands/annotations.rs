use crate::db;
use crate::models::*;
use crate::state::AppState;
use chrono::Utc;
use uuid::Uuid;

#[tauri::command]
pub async fn create_annotation(
    state: tauri::State<'_, AppState>,
    draft: AnnotationDraft,
) -> Result<Annotation, String> {
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
pub async fn update_annotation(
    state: tauri::State<'_, AppState>,
    update: AnnotationUpdate,
) -> Result<Annotation, String> {
    if update.word.trim().is_empty() {
        return Err("Word is required".to_string());
    }
    if update.sentence.trim().is_empty() {
        return Err("Context sentence is required".to_string());
    }
    let conn = state.conn.lock().await;
    db::update_annotation(&conn, &update, &Utc::now().to_rfc3339())
}

#[tauri::command]
pub async fn list_annotations(
    state: tauri::State<'_, AppState>,
    book_id: Option<String>,
) -> Result<Vec<Annotation>, String> {
    let conn = state.conn.lock().await;
    db::list_annotations(&conn, book_id.as_deref())
}

#[tauri::command]
pub async fn delete_queued_annotation(
    state: tauri::State<'_, AppState>,
    annotation_id: String,
) -> Result<(), String> {
    let conn = state.conn.lock().await;
    db::delete_queued_annotation(&conn, &annotation_id)
}
