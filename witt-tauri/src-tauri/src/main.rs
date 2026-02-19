// Prevents additional console window on Windows in development
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod mock_store;
mod models;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(mock_store::StoreState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_library_cards,
            commands::get_card,
            commands::save_capture,
            commands::update_card,
            commands::delete_card,
            commands::search_cards,
            commands::get_definitions,
            commands::get_lemma,
            commands::get_tag_suggestions
        ])
        .run(tauri::generate_context!())
        .expect("error while running witt-tauri");
}
