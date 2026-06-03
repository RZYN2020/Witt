use rusqlite::{params, Connection};

pub fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            file_path TEXT NOT NULL,
            cover_path TEXT,
            imported_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS reading_progress (
            book_id TEXT PRIMARY KEY,
            epub_cfi TEXT NOT NULL,
            chapter_href TEXT,
            progress_percent REAL NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS annotations (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL,
            word TEXT NOT NULL,
            sentence TEXT NOT NULL,
            chapter_title TEXT,
            epub_cfi TEXT,
            status TEXT NOT NULL,
            anki_note_id INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS anki_decks (
            name TEXT PRIMARY KEY,
            selected INTEGER NOT NULL DEFAULT 0,
            synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS anki_notes (
            note_id INTEGER PRIMARY KEY,
            deck_name TEXT NOT NULL,
            word TEXT NOT NULL,
            sentence TEXT,
            meaning TEXT,
            raw_fields_json TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS vocabulary (
            normalized_word TEXT PRIMARY KEY,
            display_word TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'learning',
            source TEXT NOT NULL,
            anki_note_id INTEGER,
            deck_name TEXT,
            model_name TEXT,
            raw_fields_json TEXT,
            first_seen_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS meaning_groups (
            id TEXT PRIMARY KEY,
            normalized_word TEXT NOT NULL,
            meaning TEXT NOT NULL,
            source TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(normalized_word) REFERENCES vocabulary(normalized_word) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS word_occurrences (
            id TEXT PRIMARY KEY,
            normalized_word TEXT NOT NULL,
            book_id TEXT,
            annotation_id TEXT,
            sentence TEXT NOT NULL,
            chapter_title TEXT,
            epub_cfi TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(normalized_word) REFERENCES vocabulary(normalized_word) ON DELETE CASCADE,
            FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE,
            FOREIGN KEY(annotation_id) REFERENCES annotations(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS dictionary_cache (
            normalized_word TEXT PRIMARY KEY,
            display_word TEXT NOT NULL,
            meaning TEXT NOT NULL,
            prompt_id TEXT,
            updated_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_anki_notes_deck_word ON anki_notes(deck_name, word);
        CREATE INDEX IF NOT EXISTS idx_annotations_book ON annotations(book_id);
        CREATE INDEX IF NOT EXISTS idx_vocabulary_status ON vocabulary(status, updated_at);
        CREATE INDEX IF NOT EXISTS idx_occurrences_word ON word_occurrences(normalized_word, created_at);
        CREATE INDEX IF NOT EXISTS idx_occurrences_book ON word_occurrences(book_id, normalized_word);

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        "#,
    )
    .map_err(|error| error.to_string())?;

    ensure_column(conn, "vocabulary", "deck_name", "TEXT")?;
    ensure_column(conn, "vocabulary", "model_name", "TEXT")?;
    ensure_column(conn, "vocabulary", "raw_fields_json", "TEXT")?;
    insert_default_settings(conn)?;
    backfill_vocabulary(conn)
}

fn insert_default_settings(conn: &Connection) -> Result<(), String> {
    set_default_setting(
        conn,
        "llm_endpoint",
        "https://api.openai.com/v1/chat/completions",
    )?;
    set_default_setting(conn, "llm_model", "gpt-4.1-mini")?;
    set_default_setting(conn, "llm_prompt_id", "explain")?;
    set_default_setting(conn, "anki_endpoint", crate::anki::DEFAULT_ANKI_ENDPOINT)?;
    set_default_setting(conn, "anki_model_name", crate::anki::DEFAULT_MODEL_NAME)?;
    set_default_setting(conn, "anki_word_field", "Word")?;
    set_default_setting(conn, "anki_sentence_field", "Sentence")?;
    set_default_setting(conn, "anki_book_field", "Book")?;
    set_default_setting(conn, "anki_chapter_field", "Chapter")?;
    set_default_setting(conn, "anki_meaning_field", "Meaning")?;
    set_default_setting(conn, "anki_preprocess_mode", "template")?;
    set_default_setting(conn, "anki_pipeline_id", "default")?;
    set_default_setting(
        conn,
        "anki_preprocess_template",
        &crate::llm::default_preprocess_template(),
    )?;
    set_default_setting(
        conn,
        "anki_preprocess_prompt",
        crate::llm::default_preprocess_prompt(),
    )?;
    set_default_setting(conn, "selection_auto_ask_ai", "false")?;
    set_default_setting(conn, "vocabulary_backend_mode", "hybrid")?;
    set_default_setting(conn, "visual_memory_scope", "library")?;
    set_default_setting(conn, "inline_mini_gloss", "false")?;
    Ok(())
}

fn set_default_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2)",
        params![key, value],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn ensure_column(
    conn: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), String> {
    let mut stmt = conn
        .prepare(&format!("PRAGMA table_info({table})"))
        .map_err(|error| error.to_string())?;
    let exists = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?
        .iter()
        .any(|name| name == column);
    if !exists {
        conn.execute(
            &format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"),
            [],
        )
        .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn backfill_vocabulary(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        INSERT INTO vocabulary
        (normalized_word, display_word, status, source, anki_note_id, first_seen_at, updated_at)
        SELECT LOWER(TRIM(word)), TRIM(word), 'learning', 'annotation', anki_note_id, created_at, updated_at
        FROM annotations
        WHERE TRIM(word) != ''
        ON CONFLICT(normalized_word) DO UPDATE SET
            display_word = excluded.display_word,
            source = CASE
                WHEN vocabulary.source = 'annotation' THEN vocabulary.source
                ELSE excluded.source
            END,
            anki_note_id = COALESCE(excluded.anki_note_id, vocabulary.anki_note_id),
            updated_at = excluded.updated_at;

        INSERT INTO word_occurrences
        (id, normalized_word, book_id, annotation_id, sentence, chapter_title, epub_cfi, created_at)
        SELECT 'annotation:' || id, LOWER(TRIM(word)), book_id, id, sentence, chapter_title, epub_cfi, created_at
        FROM annotations
        WHERE TRIM(word) != ''
        ON CONFLICT(id) DO UPDATE SET
            normalized_word = excluded.normalized_word,
            book_id = excluded.book_id,
            annotation_id = excluded.annotation_id,
            sentence = excluded.sentence,
            chapter_title = excluded.chapter_title,
            epub_cfi = excluded.epub_cfi;

        INSERT INTO vocabulary
        (normalized_word, display_word, status, source, anki_note_id, deck_name, raw_fields_json, first_seen_at, updated_at)
        SELECT LOWER(TRIM(word)), TRIM(word), 'learning', 'anki', note_id, deck_name, raw_fields_json, updated_at, updated_at
        FROM anki_notes
        WHERE TRIM(word) != ''
        ON CONFLICT(normalized_word) DO UPDATE SET
            display_word = excluded.display_word,
            anki_note_id = COALESCE(excluded.anki_note_id, vocabulary.anki_note_id),
            deck_name = COALESCE(excluded.deck_name, vocabulary.deck_name),
            raw_fields_json = COALESCE(excluded.raw_fields_json, vocabulary.raw_fields_json),
            updated_at = excluded.updated_at;

        INSERT INTO meaning_groups
        (id, normalized_word, meaning, source, created_at, updated_at)
        SELECT 'dictionary:' || normalized_word || ':' || COALESCE(prompt_id, 'dictionary_cache'),
               normalized_word,
               meaning,
               COALESCE(prompt_id, 'dictionary_cache'),
               updated_at,
               updated_at
        FROM dictionary_cache
        WHERE TRIM(meaning) != ''
        ON CONFLICT(id) DO UPDATE SET
            meaning = excluded.meaning,
            source = excluded.source,
            updated_at = excluded.updated_at;
        "#,
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn migrate_backfills_vocabulary_from_existing_annotations() {
        let conn = Connection::open_in_memory().expect("open in-memory database");
        migrate(&conn).expect("initial migration");
        conn.execute(
            "INSERT INTO books (id, title, author, file_path, imported_at, updated_at) VALUES ('book-1', 'Book', 'Author', '/tmp/book.epub', 'now', 'now')",
            [],
        )
        .expect("insert book");
        conn.execute(
            "INSERT INTO annotations (id, book_id, word, sentence, status, created_at, updated_at) VALUES ('ann-1', 'book-1', 'Example', 'An example sentence.', 'queued', 'now', 'now')",
            [],
        )
        .expect("insert annotation");

        migrate(&conn).expect("backfill migration");

        let word: String = conn
            .query_row(
                "SELECT display_word FROM vocabulary WHERE normalized_word = 'example'",
                [],
                |row| row.get(0),
            )
            .expect("vocabulary row");
        let occurrence: String = conn
            .query_row(
                "SELECT sentence FROM word_occurrences WHERE id = 'annotation:ann-1'",
                [],
                |row| row.get(0),
            )
            .expect("occurrence row");

        assert_eq!(word, "Example");
        assert_eq!(occurrence, "An example sentence.");
    }
}
