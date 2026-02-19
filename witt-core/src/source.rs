/*!
Source information tracking for WittCore
*/

use serde::{Deserialize, Serialize};

/// Source information for where a Context was captured from
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Source {
    /// Web browser source information
    Web {
        /// Page title
        title: String,

        /// URL of the page
        url: String,

        /// Optional favicon URL
        icon: Option<String>,
    },

    /// Video player source information
    Video {
        /// Video filename
        filename: String,

        /// Timestamp in format "HH:MM:SS"
        timestamp: String,

        /// Optional frame number
        frame: Option<u32>,
    },

    /// PDF document source information
    Pdf {
        /// PDF filename
        filename: String,

        /// Optional page number
        page: Option<u32>,
    },

    /// Application source information
    App {
        /// Application name
        name: String,

        /// Optional window title
        title: Option<String>,
    },
}

impl Source {
    /// Creates a new Web source
    pub fn web(title: impl Into<String>, url: impl Into<String>, icon: Option<String>) -> Self {
        Source::Web {
            title: title.into(),
            url: url.into(),
            icon,
        }
    }

    /// Creates a new Video source
    pub fn video(filename: impl Into<String>, timestamp: impl Into<String>, frame: Option<u32>) -> Self {
        Source::Video {
            filename: filename.into(),
            timestamp: timestamp.into(),
            frame,
        }
    }

    /// Creates a new PDF source
    pub fn pdf(filename: impl Into<String>, page: Option<u32>) -> Self {
        Source::Pdf {
            filename: filename.into(),
            page,
        }
    }

    /// Creates a new App source
    pub fn app(name: impl Into<String>, title: Option<String>) -> Self {
        Source::App {
            name: name.into(),
            title,
        }
    }

    /// Returns a short description of the source
    pub fn to_short_description(&self) -> String {
        match self {
            Source::Web { title, .. } => title.clone(),
            Source::Video { filename, .. } => filename.clone(),
            Source::Pdf { filename, .. } => filename.clone(),
            Source::App { name, title } => match title {
                Some(title) => format!("{}: {}", name, title),
                None => name.clone(),
            },
        }
    }

    /// Returns the source type as a string
    pub fn type_str(&self) -> &'static str {
        match self {
            Source::Web { .. } => "web",
            Source::Video { .. } => "video",
            Source::Pdf { .. } => "pdf",
            Source::App { .. } => "app",
        }
    }

    /// Returns true if this source has an icon
    pub fn has_icon(&self) -> bool {
        match self {
            Source::Web { icon, .. } => icon.is_some(),
            _ => false,
        }
    }

    /// Returns the icon URL if available
    pub fn icon_url(&self) -> Option<&str> {
        match self {
            Source::Web { icon, .. } => icon.as_deref(),
            _ => None,
        }
    }
}

impl ToString for Source {
    fn to_string(&self) -> String {
        match self {
            Source::Web { title, url, .. } => format!("{} ({})", title, url),
            Source::Video { filename, timestamp, frame } => format!(
                "{} @ {} {}",
                filename,
                timestamp,
                frame.map_or(String::new(), |f| format!("(frame {})", f))
            ),
            Source::Pdf { filename, page } => format!(
                "{} {}",
                filename,
                page.map_or(String::new(), |p| format!("(page {})", p))
            ),
            Source::App { name, title } => match title {
                Some(title) => format!("{}: {}", name, title),
                None => name.clone(),
            },
        }
    }
}
