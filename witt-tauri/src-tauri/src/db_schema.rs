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

        CREATE INDEX IF NOT EXISTS idx_anki_notes_deck_word ON anki_notes(deck_name, word);
        CREATE INDEX IF NOT EXISTS idx_annotations_book ON annotations(book_id);

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        "#,
    )
    .map_err(|error| error.to_string())?;

    insert_default_settings(conn)
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
