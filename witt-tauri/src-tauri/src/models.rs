use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Book {
    pub id: String,
    pub title: String,
    pub author: String,
    pub file_path: String,
    pub cover_path: Option<String>,
    pub imported_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReadingProgress {
    pub book_id: String,
    pub epub_cfi: String,
    pub chapter_href: Option<String>,
    pub progress_percent: f64,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Annotation {
    pub id: String,
    pub book_id: String,
    pub word: String,
    pub sentence: String,
    pub chapter_title: Option<String>,
    pub epub_cfi: Option<String>,
    pub status: String,
    pub anki_note_id: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnotationDraft {
    pub book_id: String,
    pub word: String,
    pub sentence: String,
    pub chapter_title: Option<String>,
    pub epub_cfi: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnotationUpdate {
    pub id: String,
    pub word: String,
    pub sentence: String,
    pub chapter_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnkiDeck {
    pub name: String,
    pub selected: bool,
    pub synced_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnkiNote {
    pub note_id: i64,
    pub deck_name: String,
    pub word: String,
    pub sentence: Option<String>,
    pub meaning: Option<String>,
    pub raw_fields_json: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VocabularyEntry {
    pub normalized_word: String,
    pub display_word: String,
    pub status: String,
    pub source: String,
    pub anki_note_id: Option<i64>,
    pub deck_name: Option<String>,
    pub model_name: Option<String>,
    pub raw_fields_json: Option<String>,
    pub cached_meaning: Option<String>,
    pub occurrence_count: i64,
    pub last_seen_at: Option<String>,
    pub first_seen_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordOccurrence {
    pub id: String,
    pub normalized_word: String,
    pub book_id: Option<String>,
    pub annotation_id: Option<String>,
    pub sentence: String,
    pub chapter_title: Option<String>,
    pub epub_cfi: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryCacheEntry {
    pub normalized_word: String,
    pub display_word: String,
    pub meaning: String,
    pub prompt_id: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DictionaryCacheDraft {
    pub word: String,
    pub meaning: String,
    pub prompt_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnkiModelInfo {
    pub name: String,
    pub fields: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    #[serde(default = "default_llm_endpoint")]
    pub llm_endpoint: String,
    #[serde(default = "default_llm_model")]
    pub llm_model: String,
    #[serde(default = "default_llm_prompt_id")]
    pub llm_prompt_id: String,
    #[serde(default = "default_anki_endpoint")]
    pub anki_endpoint: String,
    #[serde(default = "default_anki_model_name")]
    pub anki_model_name: String,
    #[serde(default = "default_anki_word_field")]
    pub anki_word_field: String,
    #[serde(default = "default_anki_sentence_field")]
    pub anki_sentence_field: String,
    #[serde(default = "default_anki_book_field")]
    pub anki_book_field: String,
    #[serde(default = "default_anki_chapter_field")]
    pub anki_chapter_field: String,
    #[serde(default = "default_anki_meaning_field")]
    pub anki_meaning_field: String,
    #[serde(default = "default_anki_preprocess_mode")]
    pub anki_preprocess_mode: String,
    #[serde(default = "default_anki_pipeline_id")]
    pub anki_pipeline_id: String,
    #[serde(default = "crate::llm::default_preprocess_template")]
    pub anki_preprocess_template: String,
    #[serde(default = "default_anki_preprocess_prompt_string")]
    pub anki_preprocess_prompt: String,
    #[serde(default)]
    pub selection_auto_ask_ai: bool,
    #[serde(default = "default_vocabulary_backend_mode")]
    pub vocabulary_backend_mode: String,
    #[serde(default = "default_visual_memory_scope")]
    pub visual_memory_scope: String,
    #[serde(default)]
    pub inline_mini_gloss: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            llm_endpoint: default_llm_endpoint(),
            llm_model: default_llm_model(),
            llm_prompt_id: default_llm_prompt_id(),
            anki_endpoint: default_anki_endpoint(),
            anki_model_name: default_anki_model_name(),
            anki_word_field: default_anki_word_field(),
            anki_sentence_field: default_anki_sentence_field(),
            anki_book_field: default_anki_book_field(),
            anki_chapter_field: default_anki_chapter_field(),
            anki_meaning_field: default_anki_meaning_field(),
            anki_preprocess_mode: default_anki_preprocess_mode(),
            anki_pipeline_id: default_anki_pipeline_id(),
            anki_preprocess_template: crate::llm::default_preprocess_template(),
            anki_preprocess_prompt: default_anki_preprocess_prompt_string(),
            selection_auto_ask_ai: false,
            vocabulary_backend_mode: default_vocabulary_backend_mode(),
            visual_memory_scope: default_visual_memory_scope(),
            inline_mini_gloss: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectionLlmRequest {
    pub selected_text: String,
    pub word: String,
    pub sentence: String,
    pub chapter_title: Option<String>,
    pub question: String,
    pub prompt_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptProfile {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub model: Option<String>,
    pub prompt: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptConfig {
    pub name: String,
    #[serde(default)]
    pub model: Option<String>,
    pub prompt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineProfile {
    pub id: String,
    pub name: String,
    pub mode: String,
    #[serde(default)]
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineConfig {
    pub name: String,
    #[serde(default = "default_anki_preprocess_mode")]
    pub mode: String,
    #[serde(default)]
    pub prompt: String,
    #[serde(default)]
    pub template: BTreeMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorConfig {
    #[serde(default = "default_editor_command")]
    pub command: String,
    #[serde(default = "default_editor_args")]
    pub args: Vec<String>,
}

impl Default for EditorConfig {
    fn default() -> Self {
        Self {
            command: default_editor_command(),
            args: default_editor_args(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfigSettings {
    #[serde(default = "default_llm_prompt_id")]
    pub llm_prompt_id: String,
    #[serde(default = "default_anki_pipeline_id")]
    pub anki_pipeline_id: String,
    #[serde(default)]
    pub selection_auto_ask_ai: bool,
    #[serde(default = "default_vocabulary_backend_mode")]
    pub vocabulary_backend_mode: String,
    #[serde(default = "default_visual_memory_scope")]
    pub visual_memory_scope: String,
    #[serde(default)]
    pub inline_mini_gloss: bool,
}

impl Default for ConfigSettings {
    fn default() -> Self {
        Self {
            llm_prompt_id: default_llm_prompt_id(),
            anki_pipeline_id: default_anki_pipeline_id(),
            selection_auto_ask_ai: false,
            vocabulary_backend_mode: default_vocabulary_backend_mode(),
            visual_memory_scope: default_visual_memory_scope(),
            inline_mini_gloss: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
    #[serde(default = "default_llm_endpoint")]
    pub endpoint: String,
    #[serde(default = "default_llm_model")]
    pub default_model: String,
}

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            endpoint: default_llm_endpoint(),
            default_model: default_llm_model(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnkiFieldsConfig {
    #[serde(default = "default_anki_word_field")]
    pub word: String,
    #[serde(default = "default_anki_sentence_field")]
    pub sentence: String,
    #[serde(default = "default_anki_book_field")]
    pub book: String,
    #[serde(default = "default_anki_chapter_field")]
    pub chapter: String,
    #[serde(default = "default_anki_meaning_field")]
    pub meaning: String,
}

impl Default for AnkiFieldsConfig {
    fn default() -> Self {
        Self {
            word: default_anki_word_field(),
            sentence: default_anki_sentence_field(),
            book: default_anki_book_field(),
            chapter: default_anki_chapter_field(),
            meaning: default_anki_meaning_field(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnkiConfig {
    #[serde(default = "default_anki_endpoint")]
    pub endpoint: String,
    #[serde(default = "default_anki_model_name")]
    pub note_type_name: String,
    #[serde(default)]
    pub fields: AnkiFieldsConfig,
}

impl Default for AnkiConfig {
    fn default() -> Self {
        Self {
            endpoint: default_anki_endpoint(),
            note_type_name: default_anki_model_name(),
            fields: AnkiFieldsConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    #[serde(default = "default_config_version")]
    pub config_version: u32,
    #[serde(default)]
    pub settings: ConfigSettings,
    #[serde(default)]
    pub llm: LlmConfig,
    #[serde(default)]
    pub anki: AnkiConfig,
    #[serde(default)]
    pub editor: EditorConfig,
    #[serde(default)]
    pub prompts: BTreeMap<String, PromptConfig>,
    #[serde(default)]
    pub pipelines: BTreeMap<String, PipelineConfig>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            config_version: default_config_version(),
            settings: ConfigSettings::default(),
            llm: LlmConfig::default(),
            anki: AnkiConfig::default(),
            editor: EditorConfig::default(),
            prompts: BTreeMap::new(),
            pipelines: BTreeMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnkiStatus {
    pub available: bool,
    pub version: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncSummary {
    pub created: usize,
    pub failed: Vec<SyncFailure>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncFailure {
    pub word: String,
    pub error: String,
}

fn default_llm_endpoint() -> String {
    "https://api.openai.com/v1/chat/completions".to_string()
}

fn default_llm_model() -> String {
    "gpt-4.1-mini".to_string()
}

fn default_llm_prompt_id() -> String {
    "explain".to_string()
}

fn default_anki_endpoint() -> String {
    crate::anki::DEFAULT_ANKI_ENDPOINT.to_string()
}

fn default_anki_model_name() -> String {
    crate::anki::DEFAULT_MODEL_NAME.to_string()
}

fn default_anki_word_field() -> String {
    "Word".to_string()
}

fn default_anki_sentence_field() -> String {
    "Sentence".to_string()
}

fn default_anki_book_field() -> String {
    "Book".to_string()
}

fn default_anki_chapter_field() -> String {
    "Chapter".to_string()
}

fn default_anki_meaning_field() -> String {
    "Meaning".to_string()
}

fn default_anki_preprocess_mode() -> String {
    "template".to_string()
}

fn default_anki_pipeline_id() -> String {
    "default".to_string()
}

fn default_vocabulary_backend_mode() -> String {
    "hybrid".to_string()
}

fn default_visual_memory_scope() -> String {
    "library".to_string()
}

fn default_anki_preprocess_prompt_string() -> String {
    crate::llm::default_preprocess_prompt().to_string()
}

fn default_editor_command() -> String {
    "code".to_string()
}

fn default_editor_args() -> Vec<String> {
    vec!["-r".to_string()]
}

fn default_config_version() -> u32 {
    1
}
