use crate::models::*;
use crate::state::AppState;
use crate::{app_config, db, settings};

#[tauri::command]
pub async fn get_settings(state: tauri::State<'_, AppState>) -> Result<AppSettings, String> {
    let config = app_config::read_config(&state.config_path)?;
    let settings = app_config::settings_from_config(&config);
    let conn = state.conn.lock().await;
    db::save_settings(&conn, &settings)?;
    Ok(settings)
}

#[tauri::command]
pub async fn save_settings(
    state: tauri::State<'_, AppState>,
    settings: AppSettings,
) -> Result<(), String> {
    let settings = app_config::update_config_from_settings(&state.config_path, settings)?;
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

#[tauri::command]
pub async fn open_app_config(state: tauri::State<'_, AppState>) -> Result<String, String> {
    let config = app_config::read_config(&state.config_path)?;
    app_config::open_config(&state.config_path, &config)?;
    Ok(state.config_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn reload_app_config(state: tauri::State<'_, AppState>) -> Result<AppSettings, String> {
    let config = app_config::read_config(&state.config_path)?;
    let settings = app_config::settings_from_config(&config);
    let conn = state.conn.lock().await;
    db::save_settings(&conn, &settings)?;
    Ok(settings)
}

#[tauri::command]
pub async fn get_app_config(state: tauri::State<'_, AppState>) -> Result<AppConfig, String> {
    app_config::read_config(&state.config_path)
}

#[tauri::command]
pub async fn save_app_config(
    state: tauri::State<'_, AppState>,
    config: AppConfig,
) -> Result<AppConfig, String> {
    app_config::write_config(&state.config_path, &config)?;
    let config = app_config::read_config(&state.config_path)?;
    let settings = app_config::settings_from_config(&config);
    let conn = state.conn.lock().await;
    db::save_settings(&conn, &settings)?;
    Ok(config)
}

#[tauri::command]
pub async fn read_app_config_toml(state: tauri::State<'_, AppState>) -> Result<String, String> {
    std::fs::read_to_string(&state.config_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_app_config_toml(
    state: tauri::State<'_, AppState>,
    content: String,
) -> Result<(), String> {
    let config: AppConfig = toml::from_str(&content).map_err(|e| e.to_string())?;
    app_config::write_config(&state.config_path, &config)
}
