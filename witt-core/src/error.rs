/*!
Error handling for WittCore
*/

use thiserror::Error;

/// Core error type for WittCore
#[derive(Error, Debug)]
pub enum WittCoreError {
    /// Error when a Note is not found
    #[error("Note not found: {0}")]
    NoteNotFound(String),

    /// Error when a Context is not found
    #[error("Context not found: {0}")]
    ContextNotFound(String),

    /// Error when maximum number of Contexts is reached
    #[error("Max contexts (5) reached for lemma: {0}")]
    MaxContextsReached(String),

    /// Error when an Inbox item is not found.
    #[error("Inbox item not found: {0}")]
    InboxItemNotFound(String),

    /// Error when a requested inbox page is out of range.
    #[error("Inbox page out of range")]
    InboxPageOutOfRange,

    /// Error when word extraction fails.
    #[error("Failed to extract words from context: {0}")]
    WordExtractionError(String),

    /// Error when processing is requested with no selected words.
    #[error("No words selected to process context")]
    NoWordsSelected,

    /// Error from the database layer
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    /// Error from the file system
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    /// Error from Anki integration
    #[error("AnkiConnect error: {0}")]
    AnkiConnect(String),

    /// Error when media file is not found
    #[error("Media not found: {0}")]
    MediaNotFound(String),

    /// Error during data migration
    #[error("Migration failed: {0}")]
    Migration(String),

    /// Error when data is invalid
    #[error("Invalid data: {0}")]
    InvalidData(String),

    /// Error when configuration is invalid
    #[error("Invalid configuration: {0}")]
    InvalidConfiguration(String),

    /// Error from HTTP requests
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),

    /// Error from serde
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    /// Error from anki_bridge library
    #[error("Anki bridge error: {0}")]
    AnkiBridgeError(#[from] anki_bridge::Error),

    /// Error from genanki-rs library
    #[error("GenAnki error: {0}")]
    GenAnkiError(#[from] genanki_rs::Error),

    /// Error when parsing a file path
    #[error("Path error: {0}")]
    PathError(String),

    /// Error when performing a search
    #[error("Search error: {0}")]
    SearchError(String),

    /// Error from config
    #[error("Config error: {0}")]
    Config(#[from] config::ConfigError),

    /// Error from logger setup
    #[error("Logger error: {0}")]
    Logger(String),
}

impl From<WittCoreError> for String {
    fn from(err: WittCoreError) -> Self {
        format!("{}", err)
    }
}

/// Result type for WittCore operations
pub type Result<T> = std::result::Result<T, WittCoreError>;
