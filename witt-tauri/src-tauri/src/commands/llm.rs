use crate::models::*;
use crate::state::AppState;
use crate::{app_config, db, settings};
use tauri::Emitter;

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
        .unwrap_or(crate::llm::DEFAULT_CHAT_PROMPT);
    let content = crate::llm::ask_chat(&settings, &api_key, &request, prompt).await?;
    Ok(ChatResponse { content })
}

#[tauri::command]
pub async fn ask_llm_chat_stream(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    request: ChatRequest,
) -> Result<String, String> {
    let config = app_config::read_config(&state.config_path)?;
    let settings = app_config::settings_from_config(&config);
    let api_key = settings::get_llm_api_key()?;
    let prompt = config
        .prompts
        .get(&settings.llm_prompt_id)
        .map(|p| p.prompt.as_str())
        .unwrap_or(crate::llm::DEFAULT_CHAT_PROMPT);

    let chapter_hint = request
        .chapter_title
        .as_ref()
        .map(|c| format!("Current chapter: \"{}\". ", c))
        .unwrap_or_default();
    let page_hint = match (request.page_number, request.total_pages) {
        (Some(cur), Some(total)) => format!("Reading page {cur} of {total}. "),
        (Some(cur), None) => format!("Reading page {cur}. "),
        _ => String::new(),
    };
    let system = format!(
        "You are a reading companion and language-learning assistant. The user is reading \"{}\" by {}. {}{}{}",
        request.book_title, request.book_author, chapter_hint, page_hint, prompt,
    );
    let mut messages: Vec<crate::llm::LlmMessage> = vec![crate::llm::LlmMessage {
        role: "system".to_string(),
        content: system,
    }];
    for msg in &request.messages {
        messages.push(crate::llm::LlmMessage {
            role: msg.role.clone(),
            content: msg.content.clone(),
        });
    }

    let session_id = uuid::Uuid::new_v4().to_string();
    let app_handle = app.clone();
    let sid = session_id.clone();
    let app_done = app_handle.clone();
    let sid_done = sid.clone();

    tokio::spawn(async move {
        let result = crate::llm::stream_chat_messages(
            &settings,
            &api_key,
            &messages,
            move |chunk| {
                let _ = app_handle.emit(
                    "chat-stream-chunk",
                    serde_json::json!({ "session_id": sid, "content": chunk }),
                );
            },
        )
        .await;

        match result {
            Ok(()) => {
                let _ = app_done.emit(
                    "chat-stream-done",
                    serde_json::json!({ "session_id": sid_done }),
                );
            }
            Err(error) => {
                let _ = app_done.emit(
                    "chat-stream-error",
                    serde_json::json!({ "session_id": sid_done, "error": error }),
                );
            }
        }
    });

    Ok(session_id)
}
