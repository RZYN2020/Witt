use crate::models::{Annotation, AppSettings, SelectionLlmRequest};
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};

pub use crate::defaults::{default_preprocess_prompt, default_preprocess_template};

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Option<Vec<ChatChoice>>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: Option<ChatMessage>,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: Option<String>,
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

async fn chat(
    settings: &AppSettings,
    api_key: &str,
    system: &str,
    user: &str,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("LLM API key is not configured".to_string());
    }
    let response = Client::new()
        .post(&settings.llm_endpoint)
        .bearer_auth(api_key)
        .json(&json!({
            "model": settings.llm_model,
            "messages": [
                { "role": "system", "content": system },
                { "role": "user", "content": user }
            ],
            "temperature": 0.2
        }))
        .send()
        .await
        .map_err(|error| error.to_string())?;

    if !response.status().is_success() {
        return Err(format!("LLM request failed: {}", response.status()));
    }

    let payload = response
        .json::<ChatResponse>()
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
