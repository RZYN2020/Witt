// Prevents additional console window on Windows in development
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
use witt_core::WittCore;
use tokio::sync::Mutex;

#[allow(dead_code)]
struct WittCoreState {
    core: Mutex<Option<WittCore>>,
}

impl Default for WittCoreState {
    fn default() -> Self {
        Self {
            core: Mutex::new(None),
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
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
            commands::get_tag_suggestions
        ])
        .run(tauri::generate_context!())
        .expect("error while running witt-tauri");
}
