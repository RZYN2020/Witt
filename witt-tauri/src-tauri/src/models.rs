use serde::{Deserialize, Serialize};
use uuid::Uuid;
use witt_core::{note::Audio, note::Context, Note};


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
    /// Optional definitions to associate with the note
    #[serde(default)]
    pub definitions: Vec<Definition>,
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

/// Paginated response for large datasets
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub items: Vec<T>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
    pub has_more: bool,
}

impl<T> PaginatedResponse<T> {
    pub fn new(items: Vec<T>, total: usize, page: usize, page_size: usize) -> Self {
        let has_more = (page + 1) * page_size < total;
        Self {
            items,
            total,
            page,
            page_size,
            has_more,
        }
    }
}

/// Batch note operation request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchNoteRequest {
    pub notes: Vec<NoteRequest>,
}

/// Batch operation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchResult {
    pub successful: Vec<String>,
    pub failed: Vec<BatchError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchError {
    pub index: usize,
    pub lemma: String,
    pub error: String,
}

/// Compact note summary for list views
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NoteSummary {
    pub lemma: String,
    pub definition: String,
    pub context_count: usize,
    pub tags: Vec<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
}

impl From<&Note> for NoteSummary {
    fn from(note: &Note) -> Self {
        Self {
            lemma: note.lemma.clone(),
            definition: note.definition.clone(),
            context_count: note.contexts.len(),
            tags: note.tags.clone(),
            created_at: note.created_at.to_rfc3339(),
            updated_at: note.updated_at.map(|dt| dt.to_rfc3339()),
        }
    }
}
