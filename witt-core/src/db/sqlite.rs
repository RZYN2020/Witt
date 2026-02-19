/*!
SQLite database access layer for WittCore
*/

use crate::*;
use chrono::{DateTime, Utc};
use sqlx::{Pool, Sqlite};
use uuid::Uuid;
use crate::note::{Audio, Image, Context};

/// SQLite database connection for WittCore
#[derive(Debug, Clone)]
pub struct SqliteDb {
    pool: Pool<Sqlite>,
}

impl SqliteDb {
    /// Creates a new SqliteDb instance and establishes a connection pool
    pub async fn connect(db_path: &std::path::Path) -> Result<Self, crate::WittCoreError> {
        let conn_str = format!("sqlite:{}", db_path.to_str().unwrap());
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(10)
            .connect(&conn_str)
            .await?;

        // Initialize database schema
        Self::init_schema(&pool).await?;

        Ok(SqliteDb { pool })
    }

    /// Initializes the database schema
    async fn init_schema(pool: &Pool<Sqlite>) -> Result<(), crate::WittCoreError> {
        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS notes (
                lemma TEXT PRIMARY KEY,
                definition TEXT NOT NULL,
                pronunciation TEXT,
                phonetics TEXT,
                tags TEXT,
                comment TEXT,
                deck TEXT NOT NULL DEFAULT 'Default',
                created_at TEXT NOT NULL,
                updated_at TEXT
            )
        "#)
        .execute(pool)
        .await?;

        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS contexts (
                id TEXT PRIMARY KEY,
                lemma TEXT NOT NULL,
                word_form TEXT NOT NULL,
                sentence TEXT NOT NULL,
                audio TEXT,
                image TEXT,
                source_type TEXT NOT NULL,
                source_data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT,
                FOREIGN KEY (lemma) REFERENCES notes(lemma) ON DELETE CASCADE
            )
        "#)
        .execute(pool)
        .await?;

        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                tag TEXT NOT NULL,
                usage_count INTEGER NOT NULL DEFAULT 1,
                last_used TEXT NOT NULL
            )
        "#)
        .execute(pool)
        .await?;

        // Create indexes for faster queries
        sqlx::query(r#"
            CREATE INDEX IF NOT EXISTS idx_contexts_lemma ON contexts(lemma)
        "#)
        .execute(pool)
        .await?;

        sqlx::query(r#"
            CREATE INDEX IF NOT EXISTS idx_contexts_word_form ON contexts(word_form)
        "#)
        .execute(pool)
        .await?;

        sqlx::query(r#"
            CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag)
        "#)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Gets all notes from the database
    pub async fn get_all_notes(&self) -> Result<Vec<Note>, crate::WittCoreError> {
        let notes = sqlx::query!(r#"SELECT * FROM notes"#)
            .fetch_all(&self.pool)
            .await?;

        let mut result = Vec::new();
        for row in notes {
            let lemma = row.lemma;
            let definition = row.definition;
            let pronunciation: Option<String> = row.pronunciation;
            let phonetics: Option<String> = row.phonetics;
            let tags: Option<String> = row.tags;
            let comment: Option<String> = row.comment;
            let deck = row.deck;
            let created_at = row.created_at;
            let updated_at = row.updated_at;

            let contexts = self.get_contexts_for_note(&lemma.clone().unwrap_or_default()).await?;
            let tags: Vec<String> = tags
                .and_then(|tags_str: String| serde_json::from_str(&tags_str).ok())
                .unwrap_or_default();
            let pronunciation = pronunciation.map(|p| Audio { file_path: p });

            let note = Note {
                lemma: lemma.unwrap_or_default(),
                definition,
                pronunciation,
                phonetics,
                tags,
                comment: comment.unwrap_or_default(),
                deck: if deck.is_empty() { "Default".to_string() } else { deck },
                contexts,
                created_at: DateTime::parse_from_rfc3339(&created_at)
                    .map_err(|e| crate::WittCoreError::InvalidData(format!("Invalid date: {}", e)))?
                    .with_timezone(&Utc),
                updated_at: updated_at.and_then(|s: String| {
                    DateTime::parse_from_rfc3339(&s)
                        .map(|dt| dt.with_timezone(&Utc))
                        .ok()
                }),
            };
            result.push(note);
        }

        Ok(result)
    }

    /// Gets a single note by lemma
    pub async fn get_note_by_lemma(&self, lemma: &str) -> Result<Option<Note>, crate::WittCoreError> {
        let row = sqlx::query!(r#"SELECT * FROM notes WHERE lemma = ?"#, lemma)
            .fetch_optional(&self.pool)
            .await?;
        
        match row {
            Some(row) => {
                let lemma: Option<String> = row.lemma;
                let definition = row.definition;
                let pronunciation: Option<String> = row.pronunciation;
                let phonetics: Option<String> = row.phonetics;
                let tags: Option<String> = row.tags;
                let comment: Option<String> = row.comment;
                let deck = row.deck;
                let created_at = row.created_at;
                let updated_at = row.updated_at;

                let contexts = self.get_contexts_for_note(&lemma.clone().unwrap_or_default()).await?;
                let tags: Vec<String> = tags
                    .and_then(|tags_str: String| serde_json::from_str(&tags_str).ok())
                    .unwrap_or_default();
                let pronunciation = pronunciation.map(|p| Audio { file_path: p });

                let note = Note {
                    lemma: lemma.unwrap_or_default(),
                    definition,
                    pronunciation,
                    phonetics,
                    tags,
                    comment: comment.unwrap_or_default(),
                    deck: if deck.is_empty() { "Default".to_string() } else { deck },
                    contexts,
                    created_at: DateTime::parse_from_rfc3339(&created_at)
                        .map_err(|e| crate::WittCoreError::InvalidData(format!("Invalid date: {}", e)))?
                        .with_timezone(&Utc),
                    updated_at: updated_at.and_then(|s: String| {
                        DateTime::parse_from_rfc3339(&s)
                            .map(|dt| dt.with_timezone(&Utc))
                            .ok()
                    }),
                };
                Ok(Some(note))
            },
            None => Ok(None),
        }
    }

    /// Saves or updates a note in the database
    pub async fn save_note(&self, note: &Note) -> Result<(), crate::WittCoreError> {
        let tags_json = serde_json::to_string(&note.tags).unwrap_or_default();
        let pronunciation = note.pronunciation.as_ref().map(|a| a.file_path.clone());
        let phonetics = note.phonetics.as_deref();
        let updated_at = note.updated_at.map(|dt| dt.to_rfc3339());

        // Check if note exists
        let existing = self.get_note_by_lemma(&note.lemma).await?;

        if existing.is_some() {
            // Update existing note
            sqlx::query!(
                r#"
                UPDATE notes
                SET definition = ?, pronunciation = ?, phonetics = ?, tags = ?,
                    comment = ?, deck = ?, updated_at = ?
                WHERE lemma = ?
                "#,
                note.definition,
                pronunciation,
                phonetics,
                tags_json,
                note.comment,
                note.deck,
                updated_at,
                note.lemma,
            )
            .execute(&self.pool)
            .await?;
        } else {
            // Create new note
            let created_at_str = note.created_at.to_rfc3339();
            sqlx::query!(
                r#"
                INSERT INTO notes (
                    lemma, definition, pronunciation, phonetics, tags,
                    comment, deck, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                "#,
                note.lemma,
                note.definition,
                pronunciation,
                phonetics,
                tags_json,
                note.comment,
                note.deck,
                created_at_str,
            )
            .execute(&self.pool)
            .await?;
        }

        // Save or update contexts
        self.save_contexts(note).await?;

        // Update tags
        self.update_tags(note.tags.clone()).await?;

        Ok(())
    }

    /// Deletes a note from the database
    pub async fn delete_note(&self, lemma: &str) -> Result<(), crate::WittCoreError> {
        sqlx::query!(r#"DELETE FROM notes WHERE lemma = ?"#, lemma)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Saves contexts for a note
    async fn save_contexts(&self, note: &Note) -> Result<(), crate::WittCoreError> {
        for context in &note.contexts {
            let audio = context.audio.as_ref().map(|a| a.file_path.clone());
            let image = context.image.as_ref().map(|i| i.file_path.clone());

            let source_type = match &context.source {
                crate::note::Source::Web { .. } => "web",
                crate::note::Source::Video { .. } => "video",
                crate::note::Source::Pdf { .. } => "pdf",
                crate::note::Source::App { .. } => "app",
            };

            let source_data = serde_json::to_string(&context.source).unwrap_or_default();
            let updated_at = context.updated_at.map(|dt| dt.to_rfc3339());

            // Check if context exists
            let existing = self.get_context_by_id(&context.id).await?;

            if existing.is_some() {
                // Update existing context
                let context_id = context.id.to_string();
                sqlx::query!(
                    r#"
                    UPDATE contexts
                    SET word_form = ?, sentence = ?, audio = ?, image = ?,
                        source_type = ?, source_data = ?, updated_at = ?
                    WHERE id = ?
                    "#,
                    context.word_form,
                    context.sentence,
                    audio,
                    image,
                    source_type,
                    source_data,
                    updated_at,
                    context_id,
                )
                .execute(&self.pool)
                .await?;
            } else {
                // Create new context
                let context_id = context.id.to_string();
                let context_created_at = context.created_at.to_rfc3339();
                sqlx::query!(
                    r#"
                    INSERT INTO contexts (
                        id, lemma, word_form, sentence, audio, image,
                        source_type, source_data, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    "#,
                    context_id,
                    note.lemma,
                    context.word_form,
                    context.sentence,
                    audio,
                    image,
                    source_type,
                    source_data,
                    context_created_at,
                )
                .execute(&self.pool)
                .await?;
            }
        }

        Ok(())
    }

    /// Deletes a context from the database
    pub async fn delete_context(&self, id: &Uuid) -> Result<(), crate::WittCoreError> {
        let id_str = id.to_string();
        sqlx::query!(r#"DELETE FROM contexts WHERE id = ?"#, id_str)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Gets a context by ID
    async fn get_context_by_id(&self, id: &Uuid) -> Result<Option<Context>, crate::WittCoreError> {
        let id_str = id.to_string();
        let row = sqlx::query!(r#"SELECT * FROM contexts WHERE id = ?"#, id_str)
            .fetch_optional(&self.pool)
            .await?;
        
        match row {
            Some(row) => {
                let id: String = row.id.unwrap_or_default();
                let id = Uuid::parse_str(&id).map_err(|e| {
                    crate::WittCoreError::InvalidData(format!("Invalid UUID: {}", e))
                })?;

                let audio: Option<String> = row.audio;
                let image: Option<String> = row.image;
                let audio = audio.map(|a| Audio { file_path: a });
                let image = image.map(|i| Image { file_path: i });
                let source_data: String = row.source_data;
                let source = serde_json::from_str(&source_data).map_err(|e| {
                    crate::WittCoreError::InvalidData(format!("Invalid source data: {}", e))
                })?;

                let created_at: String = row.created_at;
                let updated_at: Option<String> = row.updated_at;

                let context = Context {
                    id,
                    word_form: row.word_form,
                    sentence: row.sentence,
                    audio,
                    image,
                    source,
                    created_at: DateTime::parse_from_rfc3339(&created_at)
                        .map_err(|e| crate::WittCoreError::InvalidData(format!("Invalid date: {}", e)))?
                        .with_timezone(&Utc),
                    updated_at: updated_at.and_then(|s: String| {
                        DateTime::parse_from_rfc3339(&s)
                            .map(|dt| dt.with_timezone(&Utc))
                            .ok()
                    }),
                };
                Ok(Some(context))
            },
            None => Ok(None),
        }
    }

    /// Gets all contexts for a note
    async fn get_contexts_for_note(&self, lemma: &str) -> Result<Vec<Context>, crate::WittCoreError> {
        let rows = sqlx::query!(r#"SELECT * FROM contexts WHERE lemma = ?"#, lemma)
            .fetch_all(&self.pool)
            .await?;

        let mut contexts = Vec::new();
        for row in rows {
            let id: String = row.id.unwrap_or_default();
            let id = Uuid::parse_str(&id).map_err(|e| {
                crate::WittCoreError::InvalidData(format!("Invalid UUID: {}", e))
            })?;

            let audio: Option<String> = row.audio;
            let image: Option<String> = row.image;
            let audio = audio.map(|a| Audio { file_path: a });
            let image = image.map(|i| Image { file_path: i });
            let source_data: String = row.source_data;
            let source = serde_json::from_str(&source_data).map_err(|e| {
                crate::WittCoreError::InvalidData(format!("Invalid source data: {}", e))
            })?;

            let created_at: String = row.created_at;
            let updated_at: Option<String> = row.updated_at;

            let context = Context {
                id,
                word_form: row.word_form,
                sentence: row.sentence,
                audio,
                image,
                source,
                created_at: DateTime::parse_from_rfc3339(&created_at)
                    .map_err(|e| crate::WittCoreError::InvalidData(format!("Invalid date: {}", e)))?
                    .with_timezone(&Utc),
                updated_at: updated_at.and_then(|s: String| {
                    DateTime::parse_from_rfc3339(&s)
                        .map(|dt| dt.with_timezone(&Utc))
                        .ok()
                }),
            };
            contexts.push(context);
        }

        Ok(contexts)
    }

    /// Updates tag usage counts
    async fn update_tags(&self, tags: Vec<String>) -> Result<(), crate::WittCoreError> {
        let now = Utc::now().to_rfc3339();

        for tag in tags {
            // Check if tag exists
            let existing = sqlx::query!(r#"SELECT * FROM tags WHERE tag = ?"#, tag)
                .fetch_optional(&self.pool)
                .await?;

            if let Some(_row) = existing {
                sqlx::query!(
                    r#"
                    UPDATE tags
                    SET usage_count = usage_count + 1, last_used = ?
                    WHERE tag = ?
                    "#,
                    now,
                    tag,
                )
                .execute(&self.pool)
                .await?;
            } else {
                let tag_id = Uuid::new_v4().to_string();
                sqlx::query!(
                    r#"
                    INSERT INTO tags (id, tag, usage_count, last_used)
                    VALUES (?, ?, ?, ?)
                    "#,
                    tag_id,
                    tag,
                    1,
                    now,
                )
                .execute(&self.pool)
                .await?;
            }
        }

        Ok(())
    }

    /// Gets all tags from the database
    pub async fn get_all_tags(&self) -> Result<Vec<String>, crate::WittCoreError> {
        let tags: Vec<_> = sqlx::query!(r#"SELECT tag FROM tags ORDER BY usage_count DESC"#)
            .fetch_all(&self.pool)
            .await?;

        Ok(tags.iter().map(|r| r.tag.clone()).collect())
    }

    /// Gets top N tags from the database
    pub async fn get_top_tags(&self, limit: usize) -> Result<Vec<String>, crate::WittCoreError> {
        let limit_i64 = limit as i64;
        let tags: Vec<_> = sqlx::query!(
            r#"SELECT tag FROM tags ORDER BY usage_count DESC LIMIT ?"#,
            limit_i64
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(tags.iter().map(|r| r.tag.clone()).collect())
    }

    /// Searches notes using a basic query
    pub async fn search_notes(&self, query: &str) -> Result<Vec<Note>, crate::WittCoreError> {
        let query_pattern = format!("%{}%", query);

        let notes = sqlx::query!(
            r#"
            SELECT * FROM notes
            WHERE lemma LIKE ? OR definition LIKE ? OR tags LIKE ? OR comment LIKE ?
            "#,
            query_pattern,
            query_pattern,
            query_pattern,
            query_pattern,
        )
        .fetch_all(&self.pool)
        .await?;

        let mut result = Vec::new();
        for row in notes {
            let lemma: Option<String> = row.lemma;
            let definition = row.definition;
            let pronunciation: Option<String> = row.pronunciation;
            let phonetics: Option<String> = row.phonetics;
            let tags: Option<String> = row.tags;
            let comment: Option<String> = row.comment;
            let deck = row.deck;
            let created_at = row.created_at;
            let updated_at = row.updated_at;

            let contexts = self.get_contexts_for_note(&lemma.clone().unwrap_or_default()).await?;
            let tags: Vec<String> = tags
                .and_then(|tags_str: String| serde_json::from_str(&tags_str).ok())
                .unwrap_or_default();
            let pronunciation = pronunciation.map(|p| Audio { file_path: p });

            let note = Note {
                lemma: lemma.unwrap_or_default(),
                definition,
                pronunciation,
                phonetics,
                tags,
                comment: comment.unwrap_or_default(),
                deck: if deck.is_empty() { "Default".to_string() } else { deck },
                contexts,
                created_at: DateTime::parse_from_rfc3339(&created_at)
                    .map_err(|e| crate::WittCoreError::InvalidData(format!("Invalid date: {}", e)))?
                    .with_timezone(&Utc),
                updated_at: updated_at.and_then(|s: String| {
                    DateTime::parse_from_rfc3339(&s)
                        .map(|dt| dt.with_timezone(&Utc))
                        .ok()
                }),
            };
            result.push(note);
        }

        Ok(result)
    }
}
