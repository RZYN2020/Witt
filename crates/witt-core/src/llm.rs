use crate::models::{Annotation, AppSettings, ChatRequest, SelectionLlmRequest};
use futures::StreamExt;
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};

pub use crate::defaults::{default_preprocess_prompt, default_preprocess_template};

pub const DEFAULT_CHAT_PROMPT: &str = "You are a concise reading and language-learning assistant.";

#[derive(Debug, Deserialize)]
struct ApiChatResponse {
    choices: Option<Vec<ApiChatChoice>>,
}

#[derive(Debug, Deserialize)]
struct ApiChatChoice {
    message: Option<ApiChatMessage>,
}

#[derive(Debug, Deserialize)]
struct ApiChatMessage {
    content: Option<String>,
}

pub struct LlmMessage {
    pub role: String,
    pub content: String,
}

pub async fn ask_selection(
    settings: &AppSettings,
    api_key: &str,
    request: &SelectionLlmRequest,
) -> Result<String, String> {
    let system = "You are a concise reading and language-learning assistant. Answer directly, using the selected text and context.";
    ask_selection_with_prompt(settings, api_key, request, system).await
}

pub async fn ask_selection_with_prompt(
    settings: &AppSettings,
    api_key: &str,
    request: &SelectionLlmRequest,
    system: &str,
) -> Result<String, String> {
    let user = json!({
        "selected_text": request.selected_text,
        "word": request.word,
        "sentence": request.sentence,
        "chapter": request.chapter_title,
        "question": request.question,
    });
    chat(settings, api_key, system, &user.to_string()).await
}

pub async fn preprocess_annotation(
    settings: &AppSettings,
    api_key: &str,
    annotation: &Annotation,
) -> Result<Value, String> {
    let system = if settings.anki_preprocess_prompt.trim().is_empty() {
        default_preprocess_prompt()
    } else {
        settings.anki_preprocess_prompt.as_str()
    };
    let user = json!({
        "id": annotation.id,
        "word": annotation.word,
        "sentence": annotation.sentence,
        "book_id": annotation.book_id,
        "chapter": annotation.chapter_title,
        "epub_cfi": annotation.epub_cfi,
        "required_output": {
            "word": "string",
            "sentence": "string",
            "book": "string",
            "chapter": "string",
            "meaning": "string"
        }
    });
    let content = chat(settings, api_key, system, &user.to_string()).await?;
    serde_json::from_str::<Value>(&content)
        .map_err(|error| format!("LLM returned invalid JSON: {error}"))
}

pub async fn ask_chat(
    settings: &AppSettings,
    api_key: &str,
    request: &ChatRequest,
    prompt: &str,
) -> Result<String, String> {
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
    let mut messages = vec![LlmMessage {
        role: "system".to_string(),
        content: system,
    }];
    for msg in &request.messages {
        messages.push(LlmMessage {
            role: msg.role.clone(),
            content: msg.content.clone(),
        });
    }
    chat_messages(settings, api_key, &messages).await
}

pub async fn chat_messages(
    settings: &AppSettings,
    api_key: &str,
    messages: &[LlmMessage],
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("LLM API key is not configured".to_string());
    }
    let msgs: Vec<Value> = messages
        .iter()
        .map(|m| json!({ "role": m.role, "content": m.content }))
        .collect();
    let response = Client::new()
        .post(&settings.llm_endpoint)
        .bearer_auth(api_key)
        .json(&json!({
            "model": settings.llm_model,
            "messages": msgs,
            "temperature": 0.2
        }))
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!("LLM request failed: {}", response.status()));
    }

    let payload = response
        .json::<ApiChatResponse>()
        .await
        .map_err(|error| error.to_string())?;
    payload
        .choices
        .and_then(|choices| choices.into_iter().next())
        .and_then(|choice| choice.message)
        .and_then(|message| message.content)
        .filter(|content| !content.trim().is_empty())
        .ok_or_else(|| "LLM returned no content".to_string())
}

pub async fn stream_chat_messages<F>(
    settings: &AppSettings,
    api_key: &str,
    messages: &[LlmMessage],
    on_chunk: F,
) -> Result<(), String>
where
    F: Fn(&str) + Send + 'static,
{
    if api_key.trim().is_empty() {
        return Err("LLM API key is not configured".to_string());
    }
    let msgs: Vec<Value> = messages
        .iter()
        .map(|m| json!({ "role": m.role, "content": m.content }))
        .collect();
    let response = Client::new()
        .post(&settings.llm_endpoint)
        .bearer_auth(api_key)
        .json(&json!({
            "model": settings.llm_model,
            "messages": msgs,
            "temperature": 0.2,
            "stream": true
        }))
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!("LLM request failed: {}", response.status()));
    }

    let mut stream = response.bytes_stream();
    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| e.to_string())?;
        let text = String::from_utf8_lossy(&chunk);
        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() || !line.starts_with("data: ") {
                continue;
            }
            let data = &line[6..];
            if data == "[DONE]" {
                return Ok(());
            }
            if let Ok(parsed) = serde_json::from_str::<Value>(data) {
                if let Some(content) = parsed["choices"][0]["delta"]["content"].as_str() {
                    if !content.is_empty() {
                        on_chunk(content);
                    }
                }
            }
        }
    }
    Ok(())
}

async fn chat(
    settings: &AppSettings,
    api_key: &str,
    system: &str,
    user: &str,
) -> Result<String, String> {
    chat_messages(
        settings,
        api_key,
        &[
            LlmMessage {
                role: "system".to_string(),
                content: system.to_string(),
            },
            LlmMessage {
                role: "user".to_string(),
                content: user.to_string(),
            },
        ],
    )
    .await
}
