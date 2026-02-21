/*!
WittCore - Core library for Witt - Personal Language Asset Engine

Meaning through use - Inspired by Wittgenstein

WittCore manages the core logic for Witt, including note and context management,
media handling, data storage, and integration with Anki.
*/

#![forbid(unsafe_code)]
#![warn(missing_docs)]

pub mod config;
pub mod error;
pub mod logging;
pub mod note;
pub mod context;
pub mod source;
pub mod media;
pub mod search;
pub mod db;
pub mod anki;

pub use config::WittConfig;
pub use error::WittCoreError;
pub use note::Note;
pub use context::Context;
pub use source::Source;
pub use media::MediaManager;
pub use search::SearchQuery;
pub use db::SqliteDb;
pub use anki::AnkiClient;

/// Main entry point for using WittCore
pub struct WittCore {
    config: WittConfig,
    db: SqliteDb,
    media_manager: MediaManager,
}

impl WittCore {
    /// Creates a new instance of WittCore with default configuration
    pub async fn new() -> Result<Self, WittCoreError> {
        let config = WittConfig::default();
        Self::new_with_config(config).await
    }

    /// Creates a new instance of WittCore with custom configuration
    pub async fn new_with_config(config: WittConfig) -> Result<Self, WittCoreError> {
        // Initialize logging (ignore errors in development)
        if let Err(e) = logging::init_logging() {
            eprintln!("Warning: Failed to initialize logging: {}", e);
        }

        log::info!("Initializing WittCore");

        // Connect to database
        let db = SqliteDb::connect(&config.db_path).await?;

        // Initialize media manager
        let media_manager = MediaManager::new(&config.media_dir)?;

        Ok(WittCore {
            config,
            db,
            media_manager,
        })
    }

    /// Returns a reference to the configuration
    pub fn config(&self) -> &WittConfig {
        &self.config
    }

    /// Returns a reference to the database
    pub fn db(&self) -> &SqliteDb {
        &self.db
    }

    /// Returns a reference to the media manager
    pub fn media_manager(&self) -> &MediaManager {
        &self.media_manager
    }
}

/// Default implementation
impl Default for WittCore {
    fn default() -> Self {
        tokio::runtime::Runtime::new()
            .expect("Failed to create Tokio runtime")
            .block_on(async {
                Self::new().await.expect("Failed to initialize WittCore")
            })
    }
}
