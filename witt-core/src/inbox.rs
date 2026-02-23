/*!
Inbox item data model.
*/

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::note::Source;

#[derive(Debug, Clone, Serialize, Deserialize)]
/// A captured raw context that can be processed later into one or more notes.
pub struct InboxItem {
    /// Unique identifier of the inbox item.
    pub id: Uuid,
    /// Raw context text captured from a source.
    pub context: String,
    /// Source metadata for where the context came from.
    pub source: Source,
    /// Capture timestamp.
    pub captured_at: DateTime<Utc>,
    /// Whether this item has been processed into notes.
    pub processed: bool,
    /// Optional processing notes / audit string.
    pub processing_notes: Option<String>,
}

impl InboxItem {
    /// Create a new unprocessed inbox item with a fresh id and current timestamp.
    pub fn new(context: String, source: Source) -> Self {
        Self {
            id: Uuid::new_v4(),
            context,
            source,
            captured_at: Utc::now(),
            processed: false,
            processing_notes: None,
        }
    }
}
