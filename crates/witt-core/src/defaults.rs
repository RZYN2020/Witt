use serde_json::json;

pub const DEFAULT_MODEL_NAME: &str = "Witt EPUB Sentence";
pub const DEFAULT_ANKI_ENDPOINT: &str = "http://localhost:8765";
pub const DEFAULT_LLM_ENDPOINT: &str = "https://api.openai.com/v1/chat/completions";
pub const DEFAULT_LLM_MODEL: &str = "gpt-4.1-mini";

pub fn default_preprocess_template() -> String {
    json!({
        "word": "{{word}}",
        "sentence": "{{sentence}}",
        "book": "{{book_id}}",
        "chapter": "{{chapter}}",
        "meaning": ""
    })
    .to_string()
}

pub fn default_preprocess_prompt() -> &'static str {
    "Transform the reading capture into Anki-ready fields. Return strict JSON only: {\"word\":\"...\",\"sentence\":\"...\",\"book\":\"...\",\"chapter\":\"...\",\"meaning\":\"...\"}. Keep word and sentence faithful to the input. Meaning should include a concise definition, usage note, and Chinese explanation."
}
