use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use witt_core::{Source, note::Audio, note::Image, note::Context};

/// Represents a captured note with contexts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    pub lemma: String,
    pub definition: String,
    pub pronunciation: Option<Audio>,
    pub phonetics: Option<String>,
    pub tags: Vec<String>,
    pub comment: String,
    pub deck: String,
    pub contexts: Vec<Context>,
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

/// Note creation/update request from the UI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteRequest {
    pub lemma: String,
    pub definition: String,
    pub pronunciation: Option<Audio>,
    pub phonetics: Option<String>,
    pub tags: Vec<String>,
    pub comment: Option<String>,
    pub deck: Option<String>,
    pub context: Context,
}

/// Filter options for note queries
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct NoteFilter {
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
