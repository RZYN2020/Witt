use crate::models::*;
use crate::state::AppState;
use crate::{app_config, db};

#[tauri::command]
pub async fn list_prompt_profiles(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<PromptProfile>, String> {
    app_config::list_prompts(&state.config_path)
}

#[tauri::command]
pub async fn list_pipeline_profiles(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<PipelineProfile>, String> {
    app_config::list_pipelines(&state.config_path)
}

#[tauri::command]
pub async fn open_prompt_profile(
    state: tauri::State<'_, AppState>,
    _prompt_id: String,
) -> Result<String, String> {
    let config = app_config::read_config(&state.config_path)?;
    app_config::open_config(&state.config_path, &config)?;
    Ok(state.config_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_pipeline_profile(
    state: tauri::State<'_, AppState>,
    _pipeline_id: String,
) -> Result<String, String> {
    let config = app_config::read_config(&state.config_path)?;
    app_config::open_config(&state.config_path, &config)?;
    Ok(state.config_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn read_prompt_profile(
    state: tauri::State<'_, AppState>,
    prompt_id: String,
) -> Result<String, String> {
    app_config::read_prompt(&state.config_path, &prompt_id)
}

#[tauri::command]
pub async fn save_prompt_profile(
    state: tauri::State<'_, AppState>,
    prompt_id: String,
    content: String,
) -> Result<(), String> {
    app_config::save_prompt(&state.config_path, &prompt_id, &content)
}

#[tauri::command]
pub async fn read_pipeline_profile(
    state: tauri::State<'_, AppState>,
    pipeline_id: String,
) -> Result<String, String> {
    app_config::read_pipeline(&state.config_path, &pipeline_id)
}

#[tauri::command]
pub async fn save_pipeline_profile(
    state: tauri::State<'_, AppState>,
    pipeline_id: String,
    content: String,
) -> Result<(), String> {
    app_config::save_pipeline(&state.config_path, &pipeline_id, &content)?;
    let settings = app_config::settings_from_config(&app_config::read_config(&state.config_path)?);
    let conn = state.conn.lock().await;
    db::save_settings(&conn, &settings)
}

#[tauri::command]
pub async fn load_pipeline_profile(
    state: tauri::State<'_, AppState>,
    pipeline_id: String,
) -> Result<AppSettings, String> {
    let settings = app_config::load_pipeline_settings(&state.config_path, &pipeline_id)?;
    let conn = state.conn.lock().await;
    db::save_settings(&conn, &settings)?;
    Ok(settings)
}
