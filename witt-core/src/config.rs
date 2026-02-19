/*!
Configuration management for WittCore
*/

use serde::Deserialize;
use std::path::PathBuf;

/// Configuration struct for WittCore
#[derive(Debug, Deserialize, Clone)]
pub struct WittConfig {
    /// Path to the SQLite database
    pub db_path: PathBuf,

    /// Path to the media directory
    pub media_dir: PathBuf,

    /// AnkiConnect configuration
    pub anki: AnkiConfig,

    /// Search configuration
    pub search: SearchConfig,

    /// Media handling configuration
    pub media: MediaConfig,

    /// Database configuration
    pub database: DatabaseConfig,
}

/// AnkiConnect configuration
#[derive(Debug, Deserialize, Clone)]
pub struct AnkiConfig {
    /// AnkiConnect API endpoint
    pub endpoint: String,

    /// Default deck name for new notes
    pub default_deck: String,

    /// Auto-sync on capture
    pub auto_sync: bool,

    /// Anki note type names
    pub note_types: AnkiNoteTypes,
}

/// Anki note type names
#[derive(Debug, Deserialize, Clone)]
pub struct AnkiNoteTypes {
    /// Basic note type
    pub basic: String,

    /// Context note type
    pub context: String,
}

/// Search configuration
#[derive(Debug, Deserialize, Clone)]
pub struct SearchConfig {
    /// Maximum number of search results
    pub max_results: usize,

    /// Search timeout in seconds
    pub timeout: u64,

    /// Search debounce time in milliseconds
    pub debounce_ms: u64,
}

/// Media handling configuration
#[derive(Debug, Deserialize, Clone)]
pub struct MediaConfig {
    /// Maximum media file size in bytes
    pub max_file_size: u64,

    /// Supported audio formats
    pub audio_formats: Vec<String>,

    /// Supported image formats
    pub image_formats: Vec<String>,

    /// Image compression quality (0-100)
    pub image_quality: u8,

    /// Audio compression quality (0-10)
    pub audio_quality: u8,

    /// Cache size in megabytes
    pub cache_size_mb: u64,
}

/// Database configuration
#[derive(Debug, Deserialize, Clone)]
pub struct DatabaseConfig {
    /// Maximum number of connections in pool
    pub max_connections: u32,

    /// Connection timeout in seconds
    pub connect_timeout: u64,

    /// Enable WAL mode
    pub wal_mode: bool,

    /// Auto-vacuum mode
    pub auto_vacuum: bool,
}

impl Default for WittConfig {
    fn default() -> Self {
        let config = Self {
            db_path: Self::default_db_path(),
            media_dir: Self::default_media_dir(),
            anki: AnkiConfig {
                endpoint: "http://localhost:8765".to_string(),
                default_deck: "Witt".to_string(),
                auto_sync: true,
                note_types: AnkiNoteTypes {
                    basic: "Witt - Basic".to_string(),
                    context: "Witt - Context".to_string(),
                },
            },
            search: SearchConfig {
                max_results: 100,
                timeout: 10,
                debounce_ms: 300,
            },
            media: MediaConfig {
                max_file_size: 5 * 1024 * 1024, // 5MB
                audio_formats: vec!["mp3".to_string(), "wav".to_string(), "ogg".to_string()],
                image_formats: vec!["png".to_string(), "jpg".to_string(), "jpeg".to_string(), "gif".to_string()],
                image_quality: 85,
                audio_quality: 6,
                cache_size_mb: 100,
            },
            database: DatabaseConfig {
                max_connections: 10,
                connect_timeout: 30,
                wal_mode: true,
                auto_vacuum: true,
            },
        };

        // Ensure directories exist
        std::fs::create_dir_all(&config.db_path.parent().unwrap()).ok();
        std::fs::create_dir_all(&config.media_dir).ok();

        config
    }
}

impl WittConfig {
    /// Creates a new WittConfig from a configuration file
    pub fn from_file<P: AsRef<std::path::Path>>(path: P) -> Result<Self, crate::WittCoreError> {
        let config = config::Config::builder()
            .add_source(config::File::with_name(path.as_ref().to_str().unwrap()))
            .build()?;

        config.try_deserialize().map_err(|e| {
            crate::WittCoreError::InvalidConfiguration(format!("Failed to deserialize config: {}", e))
        })
    }

    /// Returns the default database path
    fn default_db_path() -> PathBuf {
        let data_dir = Self::data_dir();
        data_dir.join("witt.db")
    }

    /// Returns the default media directory
    fn default_media_dir() -> PathBuf {
        let data_dir = Self::data_dir();
        data_dir.join("media")
    }

    /// Returns the default application data directory
    fn data_dir() -> PathBuf {
        if let Some(dir) = dirs::data_dir() {
            dir.join("witt")
        } else {
            PathBuf::from("data")
        }
    }
}
