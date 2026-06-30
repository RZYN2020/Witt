// Prevents additional console window on Windows in development
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod anki;
mod anki_notes;
mod app_config;
mod books;
mod commands;
mod db;
mod llm;
mod models;
mod settings;
mod state;
mod tray;

use state::AppState;
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let state = AppState::new(app.handle()).map_err(|error| {
                Box::<dyn std::error::Error>::from(std::io::Error::other(error))
            })?;
            app.manage(state);
            tray::create_system_tray(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::import_book,
            commands::list_books,
            commands::get_book,
            commands::open_reader_window,
            commands::remove_book,
            commands::get_book_file,
            commands::save_progress,
            commands::get_progress,
            commands::create_annotation,
            commands::update_annotation,
            commands::list_annotations,
            commands::delete_queued_annotation,
            commands::sync_annotations_to_anki,
            commands::sync_anki_web,
            commands::list_anki_sync_conflicts,
            commands::export_queued_annotations_tsv,
            commands::check_anki,
            commands::list_anki_decks,
            commands::list_anki_models,
            commands::select_anki_deck,
            commands::refresh_anki_cache,
            commands::search_anki_notes,
            commands::get_anki_note,
            commands::list_vocabulary,
            commands::update_vocabulary_status,
            commands::list_word_occurrences,
            commands::list_meaning_groups,
            commands::get_dictionary_cache,
            commands::save_dictionary_cache,
            commands::ask_llm_about_selection,
            commands::ask_llm_chat,
            commands::list_prompt_profiles,
            commands::list_pipeline_profiles,
            commands::open_prompt_profile,
            commands::open_pipeline_profile,
            commands::read_prompt_profile,
            commands::save_prompt_profile,
            commands::read_pipeline_profile,
            commands::save_pipeline_profile,
            commands::load_pipeline_profile,
            commands::get_settings,
            commands::save_settings,
            commands::save_llm_api_key,
            commands::has_llm_api_key,
            commands::open_app_config,
            commands::reload_app_config,
            commands::get_app_config,
            commands::save_app_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running witt-tauri");
}
