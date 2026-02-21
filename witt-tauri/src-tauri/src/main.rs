// Prevents additional console window on Windows in development
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod tray;

use commands::WittCoreState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // Create system tray
            tray::create_system_tray(app.handle())?;
            Ok(())
        })
        .manage(WittCoreState::default())
        .invoke_handler(tauri::generate_handler![
            commands::init_core,
            commands::get_notes,
            commands::get_note,
            commands::save_note,
            commands::update_note,
            commands::delete_note,
            commands::search_notes,
            commands::get_contexts,
            commands::save_context,
            commands::update_context,
            commands::delete_context,
            commands::get_definitions,
            commands::get_lemma,
            commands::get_tag_suggestions,
            // Optimized response commands
            commands::get_notes_paginated,
            commands::batch_save_notes,
            commands::get_note_summaries,
            commands::bulk_delete_notes,
            commands::get_stats,
            // AnkiConnect commands
            commands::check_anki_connect,
            commands::get_anki_decks,
            commands::sync_to_anki,
            commands::export_to_apkg
        ])
        .run(tauri::generate_context!())
        .expect("error while running witt-tauri");
}
