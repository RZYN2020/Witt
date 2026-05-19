// Prevents additional console window on Windows in development
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod anki;
mod books;
mod commands;
mod db;
mod models;
mod settings;
mod tray;

use commands::AppState;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let state = AppState::new(app.handle()).map_err(|error| {
                Box::<dyn std::error::Error>::from(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    error,
                ))
            })?;
            app.manage(state);
            tray::create_system_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|app_handle, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Only handle the main window
                if let Some(window) = app_handle.get_webview_window("main") {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::import_book,
            commands::list_books,
            commands::get_book,
            commands::remove_book,
            commands::get_book_file,
            commands::save_progress,
            commands::get_progress,
            commands::create_annotation,
            commands::list_annotations,
            commands::sync_annotations_to_anki,
            commands::check_anki,
            commands::list_anki_decks,
            commands::select_anki_deck,
            commands::refresh_anki_cache,
            commands::search_anki_notes,
            commands::get_anki_note,
            commands::get_settings,
            commands::save_settings,
            commands::save_llm_api_key,
            commands::has_llm_api_key,
        ])
        .run(tauri::generate_context!())
        .expect("error while running witt-tauri");
}
