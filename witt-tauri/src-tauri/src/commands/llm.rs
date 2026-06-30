use crate::models::*;
use crate::state::AppState;
use crate::{app_config, db, settings};

#[tauri::command]
pub async fn ask_llm_about_selection(
    state: tauri::State<'_, AppState>,
    request: SelectionLlmRequest,
) -> Result<String, String> {
    if request.selected_text.trim().is_empty() {
        return Err("Selected text is required".to_string());
    }
    if request.question.trim().is_empty() {
        return Err("Question is required".to_string());
    }
    let config = app_config::read_config(&state.config_path)?;
    let mut settings = app_config::settings_from_config(&config);
    {
        let conn = state.conn.lock().await;
        db::save_settings(&conn, &settings)?;
    }
    let api_key = settings::get_llm_api_key()?;
    let prompt_id = request
        .prompt_id
        .as_deref()
        .unwrap_or(&settings.llm_prompt_id);
    if let Some(profile) = config.prompts.get(prompt_id) {
        if let Some(model) = app_config::prompt_model(&config, prompt_id) {
            settings.llm_model = model;
        }
        crate::llm::ask_selection_with_prompt(&settings, &api_key, &request, &profile.prompt).await
    } else {
        crate::llm::ask_selection(&settings, &api_key, &request).await
    }
}

#[tauri::command]
pub async fn ask_llm_chat(
    state: tauri::State<'_, AppState>,
    request: ChatRequest,
) -> Result<ChatResponse, String> {
    let config = app_config::read_config(&state.config_path)?;
    let settings = app_config::settings_from_config(&config);
    let api_key = settings::get_llm_api_key()?;
    let prompt = config
        .prompts
        .get(&settings.llm_prompt_id)
        .map(|p| p.prompt.as_str())
        .unwrap_or("You are a concise reading and language-learning assistant.");
    let content = crate::llm::ask_chat(&settings, &api_key, &request, prompt).await?;
    Ok(ChatResponse { content })
}
