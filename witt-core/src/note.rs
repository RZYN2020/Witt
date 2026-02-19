/*!
Note and Context management for WittCore
*/

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Word prototype (Lemma) that serves as the primary key for Notes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    /// Word lemma (primary key)
    pub lemma: String,

    /// Core definition
    pub definition: String,

    /// Pronunciation audio file
    pub pronunciation: Option<Audio>,

    /// Phonetic transcription (e.g., IPA)
    pub phonetics: Option<String>,

    /// Tags (e.g., "#Golang", "#Philosophy")
    pub tags: Vec<String>,

    /// User comments
    pub comment: String,

    /// Anki deck name
    pub deck: String,

    /// Contexts associated with this Note (maximum 5)
    pub contexts: Vec<Context>,

    /// Creation timestamp
    pub created_at: DateTime<Utc>,

    /// Last update timestamp
    pub updated_at: Option<DateTime<Utc>>,
}

/// Context (usage scenario) for a Note
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Context {
    /// Unique identifier
    pub id: Uuid,

    /// Word form in this specific context (may be different from lemma)
    pub word_form: String,

    /// Sentence containing the word form
    pub sentence: String,

    /// Audio file specific to this context
    pub audio: Option<Audio>,

    /// Image associated with this context (screenshot or diagram)
    pub image: Option<Image>,

    /// Source information (where the context was captured from)
    pub source: Source,

    /// Creation timestamp
    pub created_at: DateTime<Utc>,

    /// Last update timestamp
    pub updated_at: Option<DateTime<Utc>>,
}

/// Audio file reference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Audio {
    /// File path to the audio file (relative to media dir)
    pub file_path: String,
}

/// Image file reference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Image {
    /// File path to the image file (relative to media dir)
    pub file_path: String,
}

/// Source metadata for a context
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum Source {
    /// Web browser source
    Web {
        /// Page title
        title: String,

        /// URL
        url: String,

        /// Favicon URL
        icon: Option<String>,
    },

    /// Video player source
    Video {
        /// Video filename
        filename: String,

        /// Timestamp in format "HH:MM:SS"
        timestamp: String,

        /// Frame number (if available)
        frame: Option<u32>,
    },

    /// PDF document source
    Pdf {
        /// PDF filename
        filename: String,

        /// Page number
        page: Option<u32>,
    },

    /// Application source
    App {
        /// Application name
        name: String,

        /// Window title (if available)
        title: Option<String>,
    },
}

impl Note {
    /// Creates a new Note with a single Context
    pub fn new_with_context(
        lemma: String,
        definition: String,
        pronunciation: Option<Audio>,
        phonetics: Option<String>,
        tags: Vec<String>,
        comment: String,
        deck: String,
        context: Context,
    ) -> Self {
        let now = Utc::now();
        Self {
            lemma,
            definition,
            pronunciation,
            phonetics,
            tags,
            comment,
            deck,
            contexts: vec![context],
            created_at: now,
            updated_at: None,
        }
    }

    /// Adds a Context to the Note (maximum 5)
    pub fn add_context(&mut self, context: Context) -> Result<(), crate::WittCoreError> {
        if self.contexts.len() >= 5 {
            return Err(crate::WittCoreError::MaxContextsReached(self.lemma.clone()));
        }

        self.contexts.push(context);
        self.updated_at = Some(Utc::now());

        Ok(())
    }

    /// Removes a Context by ID
    pub fn remove_context(&mut self, context_id: &Uuid) -> Result<(), crate::WittCoreError> {
        let position = self.contexts.iter().position(|c| c.id == *context_id);

        match position {
            Some(pos) => {
                self.contexts.remove(pos);
                self.updated_at = Some(Utc::now());
                Ok(())
            }
            None => Err(crate::WittCoreError::ContextNotFound(
                context_id.to_string()
            )),
        }
    }

    /// Updates a specific Context in the Note
    pub fn update_context(&mut self, context: Context) -> Result<(), crate::WittCoreError> {
        let position = self.contexts.iter().position(|c| c.id == context.id);

        match position {
            Some(pos) => {
                self.contexts[pos] = context;
                self.updated_at = Some(Utc::now());
                Ok(())
            }
            None => Err(crate::WittCoreError::ContextNotFound(
                context.id.to_string()
            )),
        }
    }

    /// Returns an iterator over all Contexts
    pub fn contexts_iter(&self) -> impl Iterator<Item = &Context> {
        self.contexts.iter()
    }

    /// Returns a mutable iterator over all Contexts
    pub fn contexts_iter_mut(&mut self) -> impl Iterator<Item = &mut Context> {
        self.contexts.iter_mut()
    }

    /// Returns true if the Note has any Contexts
    pub fn has_contexts(&self) -> bool {
        !self.contexts.is_empty()
    }

    /// Returns the number of Contexts associated with this Note
    pub fn context_count(&self) -> usize {
        self.contexts.len()
    }

    /// Returns true if the Note has available Context slots
    pub fn has_available_slots(&self) -> bool {
        self.context_count() < 5
    }
}

impl Context {
    /// Creates a new Context
    pub fn new(
        word_form: String,
        sentence: String,
        audio: Option<Audio>,
        image: Option<Image>,
        source: Source,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            word_form,
            sentence,
            audio,
            image,
            source,
            created_at: now,
            updated_at: None,
        }
    }

    /// Updates the Context
    pub fn update(
        &mut self,
        word_form: Option<String>,
        sentence: Option<String>,
        audio: Option<Option<Audio>>,
        image: Option<Option<Image>>,
        source: Option<Source>,
    ) {
        if let Some(word_form) = word_form {
            self.word_form = word_form;
        }

        if let Some(sentence) = sentence {
            self.sentence = sentence;
        }

        if let Some(audio) = audio {
            self.audio = audio;
        }

        if let Some(image) = image {
            self.image = image;
        }

        if let Some(source) = source {
            self.source = source;
        }

        self.updated_at = Some(Utc::now());
    }
}

/// Parameters for updating a Note
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct NoteUpdate {
    /// New definition (if Some)
    pub definition: Option<String>,

    /// New pronunciation (if Some)
    pub pronunciation: Option<Option<Audio>>,

    /// New phonetics (if Some)
    pub phonetics: Option<Option<String>>,

    /// New tags (if Some)
    pub tags: Option<Vec<String>>,

    /// New comment (if Some)
    pub comment: Option<String>,

    /// New deck (if Some)
    pub deck: Option<String>,
}

impl Note {
    /// Updates a Note with the given parameters
    pub fn update(&mut self, update: NoteUpdate) {
        if let Some(definition) = update.definition {
            self.definition = definition;
        }

        if let Some(pronunciation) = update.pronunciation {
            self.pronunciation = pronunciation;
        }

        if let Some(phonetics) = update.phonetics {
            self.phonetics = phonetics;
        }

        if let Some(tags) = update.tags {
            self.tags = tags;
        }

        if let Some(comment) = update.comment {
            self.comment = comment;
        }

        if let Some(deck) = update.deck {
            self.deck = deck;
        }

        self.updated_at = Some(Utc::now());
    }
}

/// A builder pattern for creating Note instances
pub struct NoteBuilder {
    lemma: String,
    definition: String,
    pronunciation: Option<Audio>,
    phonetics: Option<String>,
    tags: Vec<String>,
    comment: String,
    deck: String,
    contexts: Vec<Context>,
}

impl NoteBuilder {
    /// Creates a new NoteBuilder
    pub fn new(lemma: impl Into<String>, definition: impl Into<String>) -> Self {
        Self {
            lemma: lemma.into(),
            definition: definition.into(),
            pronunciation: None,
            phonetics: None,
            tags: Vec::new(),
            comment: String::new(),
            deck: "Default".to_string(),
            contexts: Vec::new(),
        }
    }

    /// Sets the pronunciation
    pub fn pronunciation(mut self, pronunciation: Audio) -> Self {
        self.pronunciation = Some(pronunciation);
        self
    }

    /// Sets the phonetics
    pub fn phonetics(mut self, phonetics: impl Into<String>) -> Self {
        self.phonetics = Some(phonetics.into());
        self
    }

    /// Adds a tag
    pub fn add_tag(mut self, tag: impl Into<String>) -> Self {
        self.tags.push(tag.into());
        self
    }

    /// Sets all tags
    pub fn tags(mut self, tags: Vec<String>) -> Self {
        self.tags = tags;
        self
    }

    /// Sets the comment
    pub fn comment(mut self, comment: impl Into<String>) -> Self {
        self.comment = comment.into();
        self
    }

    /// Sets the deck
    pub fn deck(mut self, deck: impl Into<String>) -> Self {
        self.deck = deck.into();
        self
    }

    /// Adds a context
    pub fn add_context(mut self, context: Context) -> Result<Self, crate::WittCoreError> {
        if self.contexts.len() >= 5 {
            return Err(crate::WittCoreError::MaxContextsReached(self.lemma.clone()));
        }

        self.contexts.push(context);
        Ok(self)
    }

    /// Builds the Note
    pub fn build(self) -> Note {
        let now = Utc::now();
        Note {
            lemma: self.lemma,
            definition: self.definition,
            pronunciation: self.pronunciation,
            phonetics: self.phonetics,
            tags: self.tags,
            comment: self.comment,
            deck: self.deck,
            contexts: self.contexts,
            created_at: now,
            updated_at: None,
        }
    }
}
