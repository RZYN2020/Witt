use crate::models::*;
use rusqlite::{params, Connection, OptionalExtension};
use std::path::Path;

pub fn open_database(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|error| error.to_string())?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<(), String> {
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

    set_default_setting(conn, "llm_endpoint", "https://api.openai.com/v1/chat/completions")?;
    set_default_setting(conn, "llm_model", "gpt-4.1-mini")?;
    set_default_setting(conn, "anki_endpoint", crate::anki::DEFAULT_ANKI_ENDPOINT)?;
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

pub fn insert_book(conn: &Connection, book: &Book) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO books (id, title, author, file_path, cover_path, imported_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
        "#,
        params![
            book.id,
            book.title,
            book.author,
            book.file_path,
            book.cover_path,
            book.imported_at,
            book.updated_at
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn list_books(conn: &Connection) -> Result<Vec<Book>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, author, file_path, cover_path, imported_at, updated_at FROM books ORDER BY updated_at DESC",
        )
        .map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map([], row_to_book)
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

pub fn get_book(conn: &Connection, book_id: &str) -> Result<Option<Book>, String> {
    conn.query_row(
        "SELECT id, title, author, file_path, cover_path, imported_at, updated_at FROM books WHERE id = ?1",
        params![book_id],
        row_to_book,
    )
    .optional()
    .map_err(|error| error.to_string())
}

pub fn remove_book(conn: &Connection, book_id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM books WHERE id = ?1", params![book_id])
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn save_progress(conn: &Connection, progress: &ReadingProgress) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO reading_progress (book_id, epub_cfi, chapter_href, progress_percent, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(book_id) DO UPDATE SET
            epub_cfi = excluded.epub_cfi,
            chapter_href = excluded.chapter_href,
            progress_percent = excluded.progress_percent,
            updated_at = excluded.updated_at
        "#,
        params![
            progress.book_id,
            progress.epub_cfi,
            progress.chapter_href,
            progress.progress_percent,
            progress.updated_at
        ],
    )
    .map_err(|error| error.to_string())?;
    conn.execute(
        "UPDATE books SET updated_at = ?2 WHERE id = ?1",
        params![progress.book_id, progress.updated_at],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn get_progress(conn: &Connection, book_id: &str) -> Result<Option<ReadingProgress>, String> {
    conn.query_row(
        "SELECT book_id, epub_cfi, chapter_href, progress_percent, updated_at FROM reading_progress WHERE book_id = ?1",
        params![book_id],
        |row| {
            Ok(ReadingProgress {
                book_id: row.get(0)?,
                epub_cfi: row.get(1)?,
                chapter_href: row.get(2)?,
                progress_percent: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
    .optional()
    .map_err(|error| error.to_string())
}

pub fn insert_annotation(conn: &Connection, annotation: &Annotation) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO annotations
        (id, book_id, word, sentence, chapter_title, epub_cfi, status, anki_note_id, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        "#,
        params![
            annotation.id,
            annotation.book_id,
            annotation.word,
            annotation.sentence,
            annotation.chapter_title,
            annotation.epub_cfi,
            annotation.status,
            annotation.anki_note_id,
            annotation.created_at,
            annotation.updated_at
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn list_annotations(conn: &Connection, book_id: Option<&str>) -> Result<Vec<Annotation>, String> {
    let sql = if book_id.is_some() {
        "SELECT id, book_id, word, sentence, chapter_title, epub_cfi, status, anki_note_id, created_at, updated_at FROM annotations WHERE book_id = ?1 ORDER BY created_at DESC"
    } else {
        "SELECT id, book_id, word, sentence, chapter_title, epub_cfi, status, anki_note_id, created_at, updated_at FROM annotations ORDER BY created_at DESC"
    };
    let mut stmt = conn.prepare(sql).map_err(|error| error.to_string())?;
    let rows = if let Some(id) = book_id {
        stmt.query_map(params![id], row_to_annotation)
    } else {
        stmt.query_map([], row_to_annotation)
    }
    .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

pub fn mark_annotation_synced(conn: &Connection, id: &str, note_id: i64, updated_at: &str) -> Result<(), String> {
    conn.execute(
        "UPDATE annotations SET status = 'synced', anki_note_id = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, note_id, updated_at],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn upsert_deck(conn: &Connection, deck: &AnkiDeck) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO anki_decks (name, selected, synced_at)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(name) DO UPDATE SET selected = excluded.selected, synced_at = COALESCE(excluded.synced_at, anki_decks.synced_at)
        "#,
        params![deck.name, deck.selected as i32, deck.synced_at],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn select_deck(conn: &Connection, deck_name: &str) -> Result<(), String> {
    conn.execute("UPDATE anki_decks SET selected = 0", [])
        .map_err(|error| error.to_string())?;
    conn.execute(
        "INSERT INTO anki_decks (name, selected) VALUES (?1, 1) ON CONFLICT(name) DO UPDATE SET selected = 1",
        params![deck_name],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

pub fn list_decks(conn: &Connection) -> Result<Vec<AnkiDeck>, String> {
    let mut stmt = conn
        .prepare("SELECT name, selected, synced_at FROM anki_decks ORDER BY selected DESC, name ASC")
        .map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(AnkiDeck {
                name: row.get(0)?,
                selected: row.get::<_, i32>(1)? == 1,
                synced_at: row.get(2)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

pub fn selected_deck(conn: &Connection) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT name FROM anki_decks WHERE selected = 1 LIMIT 1",
        [],
        |row| row.get(0),
    )
    .optional()
    .map_err(|error| error.to_string())
}

pub fn replace_anki_notes(conn: &mut Connection, deck_name: &str, notes: &[AnkiNote], synced_at: &str) -> Result<(), String> {
    let tx = conn.transaction().map_err(|error| error.to_string())?;
    tx.execute("DELETE FROM anki_notes WHERE deck_name = ?1", params![deck_name])
        .map_err(|error| error.to_string())?;
    for note in notes {
        tx.execute(
            r#"
            INSERT INTO anki_notes (note_id, deck_name, word, sentence, meaning, raw_fields_json, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                note.note_id,
                note.deck_name,
                note.word,
                note.sentence,
                note.meaning,
                note.raw_fields_json,
                note.updated_at
            ],
        )
        .map_err(|error| error.to_string())?;
    }
    tx.execute(
        "UPDATE anki_decks SET synced_at = ?2 WHERE name = ?1",
        params![deck_name, synced_at],
    )
    .map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(())
}

pub fn search_anki_notes(conn: &Connection, deck_name: Option<&str>, query: Option<&str>) -> Result<Vec<AnkiNote>, String> {
    let query = query.unwrap_or("").trim().to_lowercase();
    let deck = deck_name.unwrap_or("").trim();
    let (sql, args): (&str, Vec<String>) = match (deck.is_empty(), query.is_empty()) {
        (false, false) => (
            "SELECT note_id, deck_name, word, sentence, meaning, raw_fields_json, updated_at FROM anki_notes WHERE deck_name = ?1 AND (LOWER(word) LIKE ?2 OR LOWER(COALESCE(sentence, '')) LIKE ?2 OR LOWER(COALESCE(meaning, '')) LIKE ?2) ORDER BY word LIMIT 500",
            vec![deck.to_string(), format!("%{}%", query)],
        ),
        (false, true) => (
            "SELECT note_id, deck_name, word, sentence, meaning, raw_fields_json, updated_at FROM anki_notes WHERE deck_name = ?1 ORDER BY word LIMIT 500",
            vec![deck.to_string()],
        ),
        (true, false) => (
            "SELECT note_id, deck_name, word, sentence, meaning, raw_fields_json, updated_at FROM anki_notes WHERE LOWER(word) LIKE ?1 OR LOWER(COALESCE(sentence, '')) LIKE ?1 OR LOWER(COALESCE(meaning, '')) LIKE ?1 ORDER BY word LIMIT 500",
            vec![format!("%{}%", query)],
        ),
        (true, true) => (
            "SELECT note_id, deck_name, word, sentence, meaning, raw_fields_json, updated_at FROM anki_notes ORDER BY word LIMIT 500",
            vec![],
        ),
    };
    let mut stmt = conn.prepare(sql).map_err(|error| error.to_string())?;
    let rows = match args.len() {
        0 => stmt.query_map([], row_to_anki_note),
        1 => stmt.query_map(params![args[0]], row_to_anki_note),
        _ => stmt.query_map(params![args[0], args[1]], row_to_anki_note),
    }
    .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

pub fn get_anki_note(conn: &Connection, note_id: i64) -> Result<Option<AnkiNote>, String> {
    conn.query_row(
        "SELECT note_id, deck_name, word, sentence, meaning, raw_fields_json, updated_at FROM anki_notes WHERE note_id = ?1",
        params![note_id],
        row_to_anki_note,
    )
    .optional()
    .map_err(|error| error.to_string())
}

pub fn get_settings(conn: &Connection) -> Result<AppSettings, String> {
    Ok(AppSettings {
        llm_endpoint: get_setting(conn, "llm_endpoint")?.unwrap_or_else(|| "https://api.openai.com/v1/chat/completions".to_string()),
        llm_model: get_setting(conn, "llm_model")?.unwrap_or_else(|| "gpt-4.1-mini".to_string()),
        anki_endpoint: get_setting(conn, "anki_endpoint")?.unwrap_or_else(|| crate::anki::DEFAULT_ANKI_ENDPOINT.to_string()),
    })
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    conn.query_row("SELECT value FROM settings WHERE key = ?1", params![key], |row| row.get(0))
        .optional()
        .map_err(|error| error.to_string())
}

pub fn save_settings(conn: &Connection, settings: &AppSettings) -> Result<(), String> {
    set_setting(conn, "llm_endpoint", &settings.llm_endpoint)?;
    set_setting(conn, "llm_model", &settings.llm_model)?;
    set_setting(conn, "anki_endpoint", &settings.anki_endpoint)?;
    Ok(())
}

fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn row_to_book(row: &rusqlite::Row<'_>) -> rusqlite::Result<Book> {
    Ok(Book {
        id: row.get(0)?,
        title: row.get(1)?,
        author: row.get(2)?,
        file_path: row.get(3)?,
        cover_path: row.get(4)?,
        imported_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn row_to_annotation(row: &rusqlite::Row<'_>) -> rusqlite::Result<Annotation> {
    Ok(Annotation {
        id: row.get(0)?,
        book_id: row.get(1)?,
        word: row.get(2)?,
        sentence: row.get(3)?,
        chapter_title: row.get(4)?,
        epub_cfi: row.get(5)?,
        status: row.get(6)?,
        anki_note_id: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

fn row_to_anki_note(row: &rusqlite::Row<'_>) -> rusqlite::Result<AnkiNote> {
    Ok(AnkiNote {
        note_id: row.get(0)?,
        deck_name: row.get(1)?,
        word: row.get(2)?,
        sentence: row.get(3)?,
        meaning: row.get(4)?,
        raw_fields_json: row.get(5)?,
        updated_at: row.get(6)?,
    })
}
