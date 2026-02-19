use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Represents a captured word card with context
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Card {
    pub id: Uuid,
    pub word: String,
    pub lemma: String,
    pub context: String,
    pub definitions: Vec<Definition>,
    pub tags: Vec<String>,
    pub source: Source,
    pub notes: Option<String>,
    pub language: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

/// A dictionary definition for a word
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Definition {
    pub id: Uuid,
    pub text: String,
    pub source: String,
    pub part_of_speech: Option<String>,
    pub is_custom: bool,
    pub is_user_edited: bool,
}

/// Source metadata for where the capture originated
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Source {
    Web {
        title: String,
        url: String,
        icon: Option<String>,
    },
    Video {
        filename: String,
        timestamp: String,
        frame: Option<u32>,
    },
    Pdf {
        filename: String,
        page: Option<u32>,
    },
    App {
        name: String,
        title: Option<String>,
    },
}

/// Capture request from the UI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureRequest {
    pub context: String,
    pub word: String,
    pub lemma: Option<String>,
    pub language: Option<String>,
    pub tags: Vec<String>,
    pub notes: Option<String>,
    pub source: Source,
}

/// Filter options for library queries
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LibraryFilter {
    pub time_range: Option<TimeRange>,
    pub source: Option<String>,
    pub tags: Vec<String>,
    pub search_query: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TimeRange {
    Today,
    ThisWeek,
    ThisMonth,
    All,
}

/// Lemma extraction request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LemmaRequest {
    pub word: String,
    pub language: String,
}

/// Definition lookup request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefinitionRequest {
    pub word: String,
    pub language: String,
}
