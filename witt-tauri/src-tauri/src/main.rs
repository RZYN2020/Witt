// Prevents additional console window on Windows in development
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod tray;

use commands::WittCoreState;
use tauri::Manager;

#[cfg(target_os = "macos")]
mod macos_window {
    use tauri::{Manager, Runtime};
    use std::sync::OnceLock;
    
    static INIT: OnceLock<bool> = OnceLock::new();

    pub fn init() {
        INIT.get_or_init(|| {
            log::info!("macOS: Window level and collection behavior handling enabled");
            true
        });
    }
    
    /// Set popup window level and collection behavior for macOS
    /// This makes the window appear on all spaces and float above other windows
    pub fn set_popup_window_level<R: Runtime>(app: &tauri::AppHandle<R>, label: &str) {
        if let Some(window) = app.get_webview_window(label) {
            // Try to set always on top via Tauri API
            let _ = window.set_always_on_top(true);
            let _ = window.set_visible_on_all_workspaces(true);
            
            log::info!("Set window {} to floating level with all spaces support (via Tauri API)", label);
        }
    }
}

#[cfg(not(target_os = "macos"))]
mod macos_window {
    pub fn init() {}
    pub fn set_popup_window_level<R: tauri::Runtime>(_app: &tauri::AppHandle<R>, _label: &str) {}
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Initialize macOS window handling
            macos_window::init();
            // Create system tray
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
            commands::simulate_copy_shortcut,
            commands::get_global_cursor_position,
            // Optimized response commands
            commands::get_notes_paginated,
            commands::batch_save_notes,
            commands::get_note_summaries,
            commands::bulk_delete_notes,
            commands::get_stats,
            // Context Inbox commands
            commands::add_to_inbox,
            commands::get_inbox_items,
            commands::get_inbox_count,
            commands::process_inbox_item,
            commands::delete_inbox_item,
            commands::delete_inbox_items,
            commands::set_inbox_item_processed,
            commands::mark_inbox_item_processed,
            commands::clear_processed_inbox_items,
            commands::clear_processed_items,
            commands::extract_words,
            commands::extract_words_with_frequency,
            // AnkiConnect commands
            commands::check_anki_connect,
            commands::get_anki_decks,
            commands::sync_to_anki,
            commands::export_to_apkg,
            // Window management
            commands::set_popup_window_level
        ])
        .run(tauri::generate_context!())
        .expect("error while running witt-tauri");
}
