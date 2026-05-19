use serde::{Deserialize, Serialize};

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
pub struct AppSettings {
    pub llm_endpoint: String,
    pub llm_model: String,
    pub anki_endpoint: String,
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
