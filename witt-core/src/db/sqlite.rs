/*!
SQLite database access layer for WittCore
*/

use crate::*;
use chrono::{DateTime, Utc};
use sqlx::{Pool, Sqlite};
use sqlx::Row;
use sqlx::sqlite::SqliteConnectOptions;
use uuid::Uuid;
use crate::note::{Audio, Image, Context};
use crate::inbox::InboxItem;

/// SQLite database connection for WittCore
#[derive(Debug, Clone)]
pub struct SqliteDb {
    pool: Pool<Sqlite>,
}

impl SqliteDb {
    /// Creates a new SqliteDb instance and establishes a connection pool
    pub async fn connect(db_path: &std::path::Path) -> Result<Self, crate::WittCoreError> {
        // Ensure parent directory exists (especially important for first-run)
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Avoid URL parsing issues (e.g. spaces in "Application Support") by using
        // filename-based connect options rather than a URI string.
        let options = SqliteConnectOptions::new()
            .filename(db_path)
            .create_if_missing(true);

        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(10)
            .connect_with(options)
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

        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS inbox_items (
                id TEXT PRIMARY KEY,
                context TEXT NOT NULL,
                source_type TEXT NOT NULL,
                source_data TEXT NOT NULL,
                captured_at TEXT NOT NULL,
                processed INTEGER NOT NULL DEFAULT 0,
                processing_notes TEXT
            )
        "#)
        .execute(pool)
        .await?;

        let fts_create_result = sqlx::query(r#"
                CREATE VIRTUAL TABLE IF NOT EXISTS inbox_items_fts
                USING fts5(
                  context,
                  source_data,
                  content='inbox_items',
                  content_rowid='rowid',
                  tokenize='unicode61'
                )
            "#)
            .execute(pool)
            .await;

        if fts_create_result.is_ok() {
            let _ = sqlx::query(r#"
                    CREATE TRIGGER IF NOT EXISTS inbox_items_ai AFTER INSERT ON inbox_items BEGIN
                      INSERT INTO inbox_items_fts(rowid, context, source_data) VALUES (new.rowid, new.context, new.source_data);
                    END;
                "#)
                .execute(pool)
                .await;

            let _ = sqlx::query(r#"
                    CREATE TRIGGER IF NOT EXISTS inbox_items_ad AFTER DELETE ON inbox_items BEGIN
                      INSERT INTO inbox_items_fts(inbox_items_fts, rowid, context, source_data) VALUES ('delete', old.rowid, old.context, old.source_data);
                    END;
                "#)
                .execute(pool)
                .await;

            let _ = sqlx::query(r#"
                    CREATE TRIGGER IF NOT EXISTS inbox_items_au AFTER UPDATE ON inbox_items BEGIN
                      INSERT INTO inbox_items_fts(inbox_items_fts, rowid, context, source_data) VALUES ('delete', old.rowid, old.context, old.source_data);
                      INSERT INTO inbox_items_fts(rowid, context, source_data) VALUES (new.rowid, new.context, new.source_data);
                    END;
                "#)
                .execute(pool)
                .await;

            let _ = sqlx::query(r#"INSERT INTO inbox_items_fts(inbox_items_fts) VALUES('rebuild')"#)
                .execute(pool)
                .await;
        }

        sqlx::query(r#"
            CREATE TABLE IF NOT EXISTS context_note_associations (
                context_id TEXT NOT NULL,
                lemma TEXT NOT NULL,
                PRIMARY KEY (context_id, lemma),
                FOREIGN KEY (lemma) REFERENCES notes(lemma) ON DELETE CASCADE,
                FOREIGN KEY (context_id) REFERENCES contexts(id) ON DELETE CASCADE
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

        sqlx::query(r#"
            CREATE INDEX IF NOT EXISTS idx_inbox_items_captured_at ON inbox_items(captured_at)
        "#)
        .execute(pool)
        .await?;

        sqlx::query(r#"
            CREATE INDEX IF NOT EXISTS idx_inbox_items_processed ON inbox_items(processed)
        "#)
        .execute(pool)
        .await?;

        Ok(())
    }

    /// Gets all notes from the database
    pub async fn get_all_notes(&self) -> Result<Vec<Note>, crate::WittCoreError> {
        let notes = sqlx::query(
            r#"SELECT lemma, definition, pronunciation, phonetics, tags, comment, deck, created_at, updated_at FROM notes"#,
        )
        .fetch_all(&self.pool)
        .await?;

        let mut result = Vec::new();
        for row in notes {
            let lemma: String = row.try_get("lemma")?;
            let definition: String = row.try_get("definition")?;
            let pronunciation: Option<String> = row.try_get("pronunciation")?;
            let phonetics: Option<String> = row.try_get("phonetics")?;
            let tags_json: Option<String> = row.try_get("tags")?;
            let comment: Option<String> = row.try_get("comment")?;
            let deck: String = row.try_get("deck")?;
            let created_at: String = row.try_get("created_at")?;
            let updated_at: Option<String> = row.try_get("updated_at")?;

            let contexts = self.get_contexts_for_note(&lemma).await?;
            let tags: Vec<String> = parse_tags_json(tags_json);
            let pronunciation = pronunciation.map(|p| Audio { file_path: p });

            let note = Note {
                lemma,
                definition,
                pronunciation,
                phonetics,
                tags,
                comment: comment.unwrap_or_default(),
                deck: if deck.is_empty() { "Default".to_string() } else { deck },
                contexts,
                created_at: parse_rfc3339(&created_at)?,
                updated_at: parse_opt_rfc3339(updated_at),
            };
            result.push(note);
        }

        Ok(result)
    }

    /// Gets a single note by lemma
    pub async fn get_note_by_lemma(&self, lemma: &str) -> Result<Option<Note>, crate::WittCoreError> {
        let row = sqlx::query(
            r#"SELECT lemma, definition, pronunciation, phonetics, tags, comment, deck, created_at, updated_at FROM notes WHERE lemma = ?"#,
        )
        .bind(lemma)
        .fetch_optional(&self.pool)
        .await?;
        
        match row {
            Some(row) => {
                let lemma: String = row.try_get("lemma")?;
                let definition: String = row.try_get("definition")?;
                let pronunciation: Option<String> = row.try_get("pronunciation")?;
                let phonetics: Option<String> = row.try_get("phonetics")?;
                let tags_json: Option<String> = row.try_get("tags")?;
                let comment: Option<String> = row.try_get("comment")?;
                let deck: String = row.try_get("deck")?;
                let created_at: String = row.try_get("created_at")?;
                let updated_at: Option<String> = row.try_get("updated_at")?;

                let contexts = self.get_contexts_for_note(&lemma).await?;
                let tags: Vec<String> = parse_tags_json(tags_json);
                let pronunciation = pronunciation.map(|p| Audio { file_path: p });

                let note = Note {
                    lemma,
                    definition,
                    pronunciation,
                    phonetics,
                    tags,
                    comment: comment.unwrap_or_default(),
                    deck: if deck.is_empty() { "Default".to_string() } else { deck },
                    contexts,
                    created_at: parse_rfc3339(&created_at)?,
                    updated_at: parse_opt_rfc3339(updated_at),
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
            sqlx::query(
                r#"
                UPDATE notes
                SET definition = ?, pronunciation = ?, phonetics = ?, tags = ?,
                    comment = ?, deck = ?, updated_at = ?
                WHERE lemma = ?
                "#,
            )
            .bind(&note.definition)
            .bind(pronunciation)
            .bind(phonetics)
            .bind(&tags_json)
            .bind(&note.comment)
            .bind(&note.deck)
            .bind(updated_at)
            .bind(&note.lemma)
            .execute(&self.pool)
            .await?;
        } else {
            // Create new note
            let created_at_str = note.created_at.to_rfc3339();
            sqlx::query(
                r#"
                INSERT INTO notes (
                    lemma, definition, pronunciation, phonetics, tags,
                    comment, deck, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&note.lemma)
            .bind(&note.definition)
            .bind(pronunciation)
            .bind(phonetics)
            .bind(&tags_json)
            .bind(&note.comment)
            .bind(&note.deck)
            .bind(&created_at_str)
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
        sqlx::query(r#"DELETE FROM notes WHERE lemma = ?"#)
            .bind(lemma)
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
                sqlx::query(
                    r#"
                    UPDATE contexts
                    SET word_form = ?, sentence = ?, audio = ?, image = ?,
                        source_type = ?, source_data = ?, updated_at = ?
                    WHERE id = ?
                    "#,
                )
                .bind(&context.word_form)
                .bind(&context.sentence)
                .bind(audio)
                .bind(image)
                .bind(source_type)
                .bind(&source_data)
                .bind(updated_at)
                .bind(&context_id)
                .execute(&self.pool)
                .await?;
            } else {
                // Create new context
                let context_id = context.id.to_string();
                let context_created_at = context.created_at.to_rfc3339();
                sqlx::query(
                    r#"
                    INSERT INTO contexts (
                        id, lemma, word_form, sentence, audio, image,
                        source_type, source_data, created_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    "#,
                )
                .bind(&context_id)
                .bind(&note.lemma)
                .bind(&context.word_form)
                .bind(&context.sentence)
                .bind(audio)
                .bind(image)
                .bind(source_type)
                .bind(&source_data)
                .bind(&context_created_at)
                .execute(&self.pool)
                .await?;
            }
        }

        Ok(())
    }

    /// Deletes a context from the database
    pub async fn delete_context(&self, id: &Uuid) -> Result<(), crate::WittCoreError> {
        let id_str = id.to_string();
        sqlx::query(r#"DELETE FROM contexts WHERE id = ?"#)
            .bind(id_str)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Gets a context by ID
    async fn get_context_by_id(&self, id: &Uuid) -> Result<Option<Context>, crate::WittCoreError> {
        let id_str = id.to_string();
        let row = sqlx::query(
            r#"SELECT id, word_form, sentence, audio, image, source_data, created_at, updated_at FROM contexts WHERE id = ?"#,
        )
        .bind(&id_str)
        .fetch_optional(&self.pool)
        .await?;
        
        match row {
            Some(row) => {
                let id: String = row.try_get("id")?;
                let id = Uuid::parse_str(&id).map_err(|e| {
                    crate::WittCoreError::InvalidData(format!("Invalid UUID: {}", e))
                })?;

                let audio: Option<String> = row.try_get("audio")?;
                let image: Option<String> = row.try_get("image")?;
                let audio = audio.map(|a| Audio { file_path: a });
                let image = image.map(|i| Image { file_path: i });
                let source_data: String = row.try_get("source_data")?;
                let source = serde_json::from_str(&source_data).map_err(|e| {
                    crate::WittCoreError::InvalidData(format!("Invalid source data: {}", e))
                })?;

                let created_at: String = row.try_get("created_at")?;
                let updated_at: Option<String> = row.try_get("updated_at")?;

                let context = Context {
                    id,
                    word_form: row.try_get("word_form")?,
                    sentence: row.try_get("sentence")?,
                    audio,
                    image,
                    source,
                    created_at: parse_rfc3339(&created_at)?,
                    updated_at: parse_opt_rfc3339(updated_at),
                };
                Ok(Some(context))
            },
            None => Ok(None),
        }
    }

    /// Gets all contexts for a note
    async fn get_contexts_for_note(&self, lemma: &str) -> Result<Vec<Context>, crate::WittCoreError> {
        let rows = sqlx::query(
            r#"SELECT id, word_form, sentence, audio, image, source_data, created_at, updated_at FROM contexts WHERE lemma = ?"#,
        )
        .bind(lemma)
        .fetch_all(&self.pool)
        .await?;

        let mut contexts = Vec::new();
        for row in rows {
            let id: String = row.try_get("id")?;
            let id = Uuid::parse_str(&id).map_err(|e| {
                crate::WittCoreError::InvalidData(format!("Invalid UUID: {}", e))
            })?;

            let audio: Option<String> = row.try_get("audio")?;
            let image: Option<String> = row.try_get("image")?;
            let audio = audio.map(|a| Audio { file_path: a });
            let image = image.map(|i| Image { file_path: i });
            let source_data: String = row.try_get("source_data")?;
            let source = serde_json::from_str(&source_data).map_err(|e| {
                crate::WittCoreError::InvalidData(format!("Invalid source data: {}", e))
            })?;

            let created_at: String = row.try_get("created_at")?;
            let updated_at: Option<String> = row.try_get("updated_at")?;

            let context = Context {
                id,
                word_form: row.try_get("word_form")?,
                sentence: row.try_get("sentence")?,
                audio,
                image,
                source,
                created_at: parse_rfc3339(&created_at)?,
                updated_at: parse_opt_rfc3339(updated_at),
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
            let existing = sqlx::query(r#"SELECT 1 FROM tags WHERE tag = ? LIMIT 1"#)
                .bind(&tag)
                .fetch_optional(&self.pool)
                .await?;

            if let Some(_row) = existing {
                sqlx::query(
                    r#"
                    UPDATE tags
                    SET usage_count = usage_count + 1, last_used = ?
                    WHERE tag = ?
                    "#,
                )
                .bind(&now)
                .bind(&tag)
                .execute(&self.pool)
                .await?;
            } else {
                let tag_id = Uuid::new_v4().to_string();
                sqlx::query(
                    r#"
                    INSERT INTO tags (id, tag, usage_count, last_used)
                    VALUES (?, ?, ?, ?)
                    "#,
                )
                .bind(&tag_id)
                .bind(&tag)
                .bind(1_i64)
                .bind(&now)
                .execute(&self.pool)
                .await?;
            }
        }

        Ok(())
    }

    /// Gets all tags from the database
    pub async fn get_all_tags(&self) -> Result<Vec<String>, crate::WittCoreError> {
        let rows = sqlx::query(r#"SELECT tag FROM tags ORDER BY usage_count DESC"#)
            .fetch_all(&self.pool)
            .await?;

        Ok(rows
            .into_iter()
            .filter_map(|r| r.try_get::<String, _>("tag").ok())
            .collect())
    }

    /// Gets top N tags from the database
    pub async fn get_top_tags(&self, limit: usize) -> Result<Vec<String>, crate::WittCoreError> {
        let rows = sqlx::query(r#"SELECT tag FROM tags ORDER BY usage_count DESC LIMIT ?"#)
            .bind(limit as i64)
            .fetch_all(&self.pool)
            .await?;

        Ok(rows
            .into_iter()
            .filter_map(|r| r.try_get::<String, _>("tag").ok())
            .collect())
    }

    /// Searches notes using a basic query
    pub async fn search_notes(&self, query: &str) -> Result<Vec<Note>, crate::WittCoreError> {
        let query_pattern = format!("%{}%", query);

        let notes = sqlx::query(
            r#"
            SELECT lemma, definition, pronunciation, phonetics, tags, comment, deck, created_at, updated_at
            FROM notes
            WHERE lemma LIKE ? OR definition LIKE ? OR tags LIKE ? OR comment LIKE ?
            "#,
        )
        .bind(&query_pattern)
        .bind(&query_pattern)
        .bind(&query_pattern)
        .bind(&query_pattern)
        .fetch_all(&self.pool)
        .await?;

        let mut result = Vec::new();
        for row in notes {
            let lemma: String = row.try_get("lemma")?;
            let definition: String = row.try_get("definition")?;
            let pronunciation: Option<String> = row.try_get("pronunciation")?;
            let phonetics: Option<String> = row.try_get("phonetics")?;
            let tags_json: Option<String> = row.try_get("tags")?;
            let comment: Option<String> = row.try_get("comment")?;
            let deck: String = row.try_get("deck")?;
            let created_at: String = row.try_get("created_at")?;
            let updated_at: Option<String> = row.try_get("updated_at")?;

            let contexts = self.get_contexts_for_note(&lemma).await?;
            let tags: Vec<String> = parse_tags_json(tags_json);
            let pronunciation = pronunciation.map(|p| Audio { file_path: p });

            let note = Note {
                lemma,
                definition,
                pronunciation,
                phonetics,
                tags,
                comment: comment.unwrap_or_default(),
                deck: if deck.is_empty() { "Default".to_string() } else { deck },
                contexts,
                created_at: parse_rfc3339(&created_at)?,
                updated_at: parse_opt_rfc3339(updated_at),
            };
            result.push(note);
        }

        Ok(result)
    }

    /// Insert a new inbox item into the database.
    pub async fn add_inbox_item(&self, item: &InboxItem) -> Result<(), crate::WittCoreError> {
        let source_type = match &item.source {
            crate::note::Source::Web { .. } => "web",
            crate::note::Source::Video { .. } => "video",
            crate::note::Source::Pdf { .. } => "pdf",
            crate::note::Source::App { .. } => "app",
        };
        let source_data = serde_json::to_string(&item.source).unwrap_or_default();

        sqlx::query(
            r#"
            INSERT INTO inbox_items (id, context, source_type, source_data, captured_at, processed, processing_notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(item.id.to_string())
        .bind(&item.context)
        .bind(source_type)
        .bind(source_data)
        .bind(item.captured_at.to_rfc3339())
        .bind(if item.processed { 1_i64 } else { 0_i64 })
        .bind(item.processing_notes.clone())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get a single inbox item by id.
    pub async fn get_inbox_item(&self, id: &Uuid) -> Result<Option<InboxItem>, crate::WittCoreError> {
        let row = sqlx::query(
            r#"
            SELECT id, context, source_data, captured_at, processed, processing_notes
            FROM inbox_items
            WHERE id = ?
            "#,
        )
        .bind(id.to_string())
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => {
                let raw_id: String = row.try_get("id")?;
                let id = Uuid::parse_str(&raw_id)
                    .map_err(|e| crate::WittCoreError::InvalidData(format!("Invalid UUID: {}", e)))?;
                let source_data: String = row.try_get("source_data")?;
                let source = serde_json::from_str(&source_data)
                    .map_err(|e| crate::WittCoreError::InvalidData(format!("Invalid source data: {}", e)))?;
                let captured_at: String = row.try_get("captured_at")?;
                let processed_i: i64 = row.try_get("processed")?;
                let processing_notes: Option<String> = row.try_get("processing_notes")?;

                Ok(Some(InboxItem {
                    id,
                    context: row.try_get("context")?,
                    source,
                    captured_at: parse_rfc3339(&captured_at)?,
                    processed: processed_i != 0,
                    processing_notes,
                }))
            }
            None => Ok(None),
        }
    }

    /// Get inbox items for a page with optional filtering.
    pub async fn get_inbox_items_page(
        &self,
        page: usize,
        page_size: usize,
        search: Option<&str>,
        source_type: Option<&str>,
        processed: Option<bool>,
        captured_after: Option<&str>,
        captured_before: Option<&str>,
    ) -> Result<(Vec<InboxItem>, usize), crate::WittCoreError> {
        let page_size_i64 = page_size as i64;
        let offset_i64 = (page as i64) * page_size_i64;

        let search_term = search.map(|s| s.trim()).filter(|s| !s.is_empty());
        let fts_query = search_term.and_then(build_fts_query);
        let use_fts = if fts_query.is_some() {
            self.inbox_fts_available().await.unwrap_or(false)
        } else {
            false
        };

        let captured_after = captured_after.map(|s| s.trim()).filter(|s| !s.is_empty());
        let captured_before = captured_before.map(|s| s.trim()).filter(|s| !s.is_empty());

        let mut where_sql = String::new();
        let mut conditions: Vec<String> = Vec::new();

        if search_term.is_some() {
            if use_fts {
                conditions.push("inbox_items_fts MATCH ?".to_string());
            } else {
                conditions.push("(context LIKE ? OR source_data LIKE ?)".to_string());
            }
        }
        if source_type.is_some() {
            conditions.push("source_type = ?".to_string());
        }
        if processed.is_some() {
            conditions.push("processed = ?".to_string());
        }
        if captured_after.is_some() {
            conditions.push("captured_at >= ?".to_string());
        }
        if captured_before.is_some() {
            conditions.push("captured_at <= ?".to_string());
        }

        if !conditions.is_empty() {
            where_sql.push_str(" WHERE ");
            where_sql.push_str(&conditions.join(" AND "));
        }

        let count_sql = if use_fts {
            format!(
                "SELECT COUNT(*) as total FROM inbox_items JOIN inbox_items_fts ON inbox_items_fts.rowid = inbox_items.rowid{}",
                where_sql
            )
        } else {
            format!("SELECT COUNT(*) as total FROM inbox_items{}", where_sql)
        };
        let mut count_q = sqlx::query(&count_sql);
        if let Some(s) = search_term {
            if use_fts {
                count_q = count_q.bind(fts_query.clone().unwrap_or_default());
            } else {
                let like = format!("%{}%", s);
                count_q = count_q.bind(like.clone());
                count_q = count_q.bind(like);
            }
        }
        if let Some(st) = source_type {
            count_q = count_q.bind(st);
        }
        if let Some(p) = processed {
            count_q = count_q.bind(if p { 1_i64 } else { 0_i64 });
        }
        if let Some(after) = captured_after {
            count_q = count_q.bind(after);
        }
        if let Some(before) = captured_before {
            count_q = count_q.bind(before);
        }
        let count_row = count_q.fetch_one(&self.pool).await?;
        let total: i64 = count_row.try_get("total")?;
        let total_usize = usize::try_from(total).unwrap_or(0);

        let items_sql = if use_fts {
            format!(
                r#"
                SELECT inbox_items.id, inbox_items.context, inbox_items.source_data, inbox_items.captured_at, inbox_items.processed, inbox_items.processing_notes
                FROM inbox_items
                JOIN inbox_items_fts ON inbox_items_fts.rowid = inbox_items.rowid
                {}
                ORDER BY bm25(inbox_items_fts) ASC, inbox_items.captured_at DESC
                LIMIT ? OFFSET ?
                "#,
                where_sql
            )
        } else {
            format!(
                r#"
                SELECT id, context, source_data, captured_at, processed, processing_notes
                FROM inbox_items
                {}
                ORDER BY captured_at DESC
                LIMIT ? OFFSET ?
                "#,
                where_sql
            )
        };

        let mut items_q = sqlx::query(&items_sql);
        if let Some(s) = search_term {
            if use_fts {
                items_q = items_q.bind(fts_query.clone().unwrap_or_default());
            } else {
                let like = format!("%{}%", s);
                items_q = items_q.bind(like.clone());
                items_q = items_q.bind(like);
            }
        }
        if let Some(st) = source_type {
            items_q = items_q.bind(st);
        }
        if let Some(p) = processed {
            items_q = items_q.bind(if p { 1_i64 } else { 0_i64 });
        }
        if let Some(after) = captured_after {
            items_q = items_q.bind(after);
        }
        if let Some(before) = captured_before {
            items_q = items_q.bind(before);
        }
        items_q = items_q.bind(page_size_i64).bind(offset_i64);

        let rows = items_q.fetch_all(&self.pool).await?;
        let mut items: Vec<InboxItem> = Vec::new();

        for row in rows {
            let raw_id: String = row.try_get("id")?;
            let id = Uuid::parse_str(&raw_id)
                .map_err(|e| crate::WittCoreError::InvalidData(format!("Invalid UUID: {}", e)))?;
            let source_data: String = row.try_get("source_data")?;
            let source = serde_json::from_str(&source_data)
                .map_err(|e| crate::WittCoreError::InvalidData(format!("Invalid source data: {}", e)))?;
            let captured_at: String = row.try_get("captured_at")?;
            let processed_i: i64 = row.try_get("processed")?;
            let processing_notes: Option<String> = row.try_get("processing_notes")?;

            items.push(InboxItem {
                id,
                context: row.try_get("context")?,
                source,
                captured_at: parse_rfc3339(&captured_at)?,
                processed: processed_i != 0,
                processing_notes,
            });
        }

        Ok((items, total_usize))
    }

    /// Count inbox items with an optional processed filter.
    pub async fn count_inbox_items(
        &self,
        processed: Option<bool>,
    ) -> Result<usize, crate::WittCoreError> {
        let mut sql = "SELECT COUNT(*) as total FROM inbox_items".to_string();
        if processed.is_some() {
            sql.push_str(" WHERE processed = ?");
        }

        let mut q = sqlx::query(&sql);
        if let Some(p) = processed {
            q = q.bind(if p { 1_i64 } else { 0_i64 });
        }

        let row = q.fetch_one(&self.pool).await?;
        let total: i64 = row.try_get("total")?;
        Ok(usize::try_from(total).unwrap_or(0))
    }

    /// Update processed state and optional notes for an inbox item.
    pub async fn set_inbox_item_processed(
        &self,
        id: &Uuid,
        processed: bool,
        notes: Option<&str>,
    ) -> Result<(), crate::WittCoreError> {
        sqlx::query(
            r#"
            UPDATE inbox_items
            SET processed = ?, processing_notes = ?
            WHERE id = ?
            "#,
        )
        .bind(if processed { 1_i64 } else { 0_i64 })
        .bind(notes.map(|s| s.to_string()))
        .bind(id.to_string())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Delete a single inbox item by id.
    pub async fn delete_inbox_item(&self, id: &Uuid) -> Result<(), crate::WittCoreError> {
        sqlx::query(r#"DELETE FROM inbox_items WHERE id = ?"#)
            .bind(id.to_string())
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Delete all processed inbox items.
    pub async fn clear_processed_inbox_items(&self) -> Result<(), crate::WittCoreError> {
        sqlx::query(r#"DELETE FROM inbox_items WHERE processed = 1"#)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Process an inbox item into notes for the given lemmas and mark it processed.
    pub async fn process_inbox_item(
        &self,
        id: &Uuid,
        lemmas: Vec<String>,
    ) -> Result<Vec<Note>, crate::WittCoreError> {
        if lemmas.is_empty() {
            return Err(crate::WittCoreError::NoWordsSelected);
        }

        let item = self
            .get_inbox_item(id)
            .await?
            .ok_or_else(|| crate::WittCoreError::InboxItemNotFound(id.to_string()))?;

        let mut processed_notes: Vec<Note> = Vec::new();

        for raw_lemma in lemmas {
            let lemma = raw_lemma.trim().to_lowercase();
            if lemma.is_empty() {
                continue;
            }

            let mut note = match self.get_note_by_lemma(&lemma).await? {
                Some(n) => n,
                None => Note {
                    lemma: lemma.clone(),
                    definition: String::new(),
                    pronunciation: None,
                    phonetics: None,
                    tags: Vec::new(),
                    comment: String::new(),
                    deck: "Default".to_string(),
                    contexts: Vec::new(),
                    created_at: Utc::now(),
                    updated_at: None,
                },
            };

            let word_form = best_effort_word_form(&item.context, &lemma);
            let context = crate::note::Context::new(word_form, item.context.clone(), None, None, item.source.clone());
            note.add_context(context.clone())?;
            self.save_note(&note).await?;

            sqlx::query(
                r#"
                INSERT OR IGNORE INTO context_note_associations (context_id, lemma)
                VALUES (?, ?)
                "#,
            )
            .bind(context.id.to_string())
            .bind(&note.lemma)
            .execute(&self.pool)
            .await?;

            processed_notes.push(note);
        }

        self.set_inbox_item_processed(
            id,
            true,
            Some(&format!("Processed with {} words", processed_notes.len())),
        )
        .await?;

        Ok(processed_notes)
    }
}

fn best_effort_word_form(sentence: &str, lemma: &str) -> String {
    if lemma.is_empty() {
        return String::new();
    }

    if sentence.is_ascii() && lemma.is_ascii() {
        let hay = sentence.to_ascii_lowercase();
        let needle = lemma.to_ascii_lowercase();
        if let Some(idx) = hay.find(&needle) {
            let end = (idx + lemma.len()).min(sentence.len());
            return sentence[idx..end].to_string();
        }
    }

    lemma.to_string()
}

impl SqliteDb {
    async fn inbox_fts_available(&self) -> Result<bool, crate::WittCoreError> {
        let row = sqlx::query(r#"SELECT name FROM sqlite_master WHERE type='table' AND name='inbox_items_fts' LIMIT 1"#)
            .fetch_optional(&self.pool)
            .await?;
        Ok(row.is_some())
    }
}

fn build_fts_query(raw: &str) -> Option<String> {
    let mut tokens: Vec<String> = Vec::new();
    let mut buf = String::new();

    for ch in raw.chars() {
        if ch.is_alphanumeric() {
            for lc in ch.to_lowercase() {
                buf.push(lc);
            }
        } else if !buf.is_empty() {
            tokens.push(std::mem::replace(&mut buf, String::new()));
        }
    }
    if !buf.is_empty() {
        tokens.push(buf);
    }

    tokens.retain(|t| t.len() >= 2);
    tokens.sort();
    tokens.dedup();

    if tokens.is_empty() {
        return None;
    }

    let q = tokens
        .into_iter()
        .map(|t| format!("\"{}\"*", t.replace('"', "")))
        .collect::<Vec<_>>()
        .join(" OR ");
    Some(q)
}

fn parse_rfc3339(s: &str) -> Result<DateTime<Utc>, crate::WittCoreError> {
    DateTime::parse_from_rfc3339(s)
        .map_err(|e| crate::WittCoreError::InvalidData(format!("Invalid date: {}", e)))
        .map(|dt| dt.with_timezone(&Utc))
}

fn parse_opt_rfc3339(s: Option<String>) -> Option<DateTime<Utc>> {
    s.and_then(|raw| DateTime::parse_from_rfc3339(&raw).ok().map(|dt| dt.with_timezone(&Utc)))
}

fn parse_tags_json(tags_json: Option<String>) -> Vec<String> {
    tags_json
        .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
        .unwrap_or_default()
}
