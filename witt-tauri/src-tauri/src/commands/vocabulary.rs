use crate::db;
use crate::models::*;
use crate::state::AppState;
use chrono::Utc;

#[tauri::command]
pub async fn list_vocabulary(
    state: tauri::State<'_, AppState>,
    query: Option<String>,
) -> Result<Vec<VocabularyEntry>, String> {
    let conn = state.conn.lock().await;
    db::list_vocabulary(&conn, query.as_deref())
}

#[tauri::command]
pub async fn update_vocabulary_status(
    state: tauri::State<'_, AppState>,
    word: String,
    status: String,
) -> Result<Option<VocabularyEntry>, String> {
    let allowed = ["new", "learning", "known", "ignored"];
    if !allowed.contains(&status.as_str()) {
        return Err("Unsupported vocabulary status".to_string());
    }
    let conn = state.conn.lock().await;
    db::update_vocabulary_status(&conn, &word, &status, &Utc::now().to_rfc3339())
}

#[tauri::command]
pub async fn list_word_occurrences(
    state: tauri::State<'_, AppState>,
    word: String,
) -> Result<Vec<WordOccurrence>, String> {
    let conn = state.conn.lock().await;
    db::list_word_occurrences(&conn, &word)
}

#[tauri::command]
pub async fn get_dictionary_cache(
    state: tauri::State<'_, AppState>,
    word: String,
    prompt_id: Option<String>,
) -> Result<Option<DictionaryCacheEntry>, String> {
    let conn = state.conn.lock().await;
    db::get_dictionary_cache(&conn, &word, prompt_id.as_deref())
}

#[tauri::command]
pub async fn save_dictionary_cache(
    state: tauri::State<'_, AppState>,
    draft: DictionaryCacheDraft,
) -> Result<DictionaryCacheEntry, String> {
    let conn = state.conn.lock().await;
    db::save_dictionary_cache(&conn, &draft, &Utc::now().to_rfc3339())
}
