use crate::models::*;
use crate::state::AppState;
use crate::{books, db};
use chrono::Utc;
use tauri::Manager;
use tauri::{WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
pub async fn import_book(
    state: tauri::State<'_, AppState>,
    source_path: String,
) -> Result<Book, String> {
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
pub async fn get_book(
    state: tauri::State<'_, AppState>,
    book_id: String,
) -> Result<Option<Book>, String> {
    let conn = state.conn.lock().await;
    db::get_book(&conn, &book_id)
}

#[tauri::command]
pub async fn open_reader_window(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    book_id: String,
) -> Result<(), String> {
    let book = {
        let conn = state.conn.lock().await;
        db::get_book(&conn, &book_id)?.ok_or_else(|| "Book not found".to_string())?
    };
    let label = format!("reader-{}", book.id);

    if let Some(window) = app.get_webview_window(&label) {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        label,
        WebviewUrl::App(format!("index.html?reader={}", book.id).into()),
    )
    .title(format!("{} - Witt", book.title))
    .inner_size(1120.0, 780.0)
    .min_inner_size(760.0, 560.0)
    .resizable(true)
    .build()
    .map_err(|error| error.to_string())?;

    Ok(())
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
pub async fn get_book_file(
    state: tauri::State<'_, AppState>,
    book_id: String,
) -> Result<Vec<u8>, String> {
    let book = {
        let conn = state.conn.lock().await;
        db::get_book(&conn, &book_id)?.ok_or_else(|| "Book not found".to_string())?
    };
    books::read_book_bytes(&book.file_path)
}

#[tauri::command]
pub async fn save_progress(
    state: tauri::State<'_, AppState>,
    progress: ReadingProgress,
) -> Result<(), String> {
    let mut progress = progress;
    progress.updated_at = Utc::now().to_rfc3339();
    let conn = state.conn.lock().await;
    db::save_progress(&conn, &progress)
}

#[tauri::command]
pub async fn get_progress(
    state: tauri::State<'_, AppState>,
    book_id: String,
) -> Result<Option<ReadingProgress>, String> {
    let conn = state.conn.lock().await;
    db::get_progress(&conn, &book_id)
}
