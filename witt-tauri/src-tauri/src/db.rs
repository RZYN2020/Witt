use crate::models::*;
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::HashMap;
use std::path::Path;

pub use crate::db_settings::{get_settings, save_settings};

const BOOK_SELECT: &str =
    "SELECT id, title, author, file_path, cover_path, imported_at, updated_at FROM books";
const ANNOTATION_SELECT: &str = "SELECT id, book_id, word, sentence, chapter_title, epub_cfi, status, anki_note_id, created_at, updated_at FROM annotations";
const ANKI_NOTE_SELECT: &str =
    "SELECT note_id, deck_name, word, sentence, meaning, raw_fields_json, updated_at FROM anki_notes";
const ANKI_NOTE_SEARCH_FILTER: &str =
    "LOWER(word) LIKE ?1 OR LOWER(COALESCE(sentence, '')) LIKE ?1 OR LOWER(COALESCE(meaning, '')) LIKE ?1";
const VOCABULARY_SELECT: &str = r#"
    SELECT
        v.normalized_word,
        v.display_word,
        v.status,
        v.source,
        v.anki_note_id,
        v.deck_name,
        v.model_name,
        v.raw_fields_json,
        MAX(dc.meaning) AS cached_meaning,
        COUNT(o.id) AS occurrence_count,
        MAX(o.created_at) AS last_seen_at,
        v.first_seen_at,
        v.updated_at
    FROM vocabulary v
    LEFT JOIN word_occurrences o ON o.normalized_word = v.normalized_word
    LEFT JOIN dictionary_cache dc ON dc.normalized_word = v.normalized_word
"#;
const OCCURRENCE_SELECT: &str = "SELECT id, normalized_word, book_id, annotation_id, sentence, chapter_title, epub_cfi, created_at FROM word_occurrences";
const MEANING_GROUP_SELECT: &str =
    "SELECT id, normalized_word, meaning, source, created_at, updated_at FROM meaning_groups";
const DICTIONARY_CACHE_SELECT: &str =
    "SELECT normalized_word, display_word, meaning, prompt_id, updated_at FROM dictionary_cache";

pub fn open_database(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|error| error.to_string())?;
    crate::db_schema::migrate(&conn)?;
    Ok(conn)
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
    let sql = format!("{BOOK_SELECT} ORDER BY updated_at DESC");
    let mut stmt = conn.prepare(&sql).map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map([], row_to_book)
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

pub fn get_book(conn: &Connection, book_id: &str) -> Result<Option<Book>, String> {
    let sql = format!("{BOOK_SELECT} WHERE id = ?1");
    conn.query_row(&sql, params![book_id], row_to_book)
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
    upsert_vocabulary_from_annotation(conn, annotation)?;
    Ok(())
}

pub fn update_annotation(
    conn: &Connection,
    update: &AnnotationUpdate,
    updated_at: &str,
) -> Result<Annotation, String> {
    conn.execute(
        r#"
        UPDATE annotations
        SET word = ?2, sentence = ?3, chapter_title = ?4, status = 'queued', updated_at = ?5
        WHERE id = ?1
        "#,
        params![
            update.id,
            update.word,
            update.sentence,
            update.chapter_title,
            updated_at
        ],
    )
    .map_err(|error| error.to_string())?;
    let annotation =
        get_annotation(conn, &update.id)?.ok_or_else(|| "Annotation not found".to_string())?;
    upsert_vocabulary_from_annotation(conn, &annotation)?;
    Ok(annotation)
}

pub fn get_annotation(
    conn: &Connection,
    annotation_id: &str,
) -> Result<Option<Annotation>, String> {
    let sql = format!("{ANNOTATION_SELECT} WHERE id = ?1");
    conn.query_row(&sql, params![annotation_id], row_to_annotation)
        .optional()
        .map_err(|error| error.to_string())
}

pub fn delete_queued_annotation(conn: &Connection, annotation_id: &str) -> Result<(), String> {
    let affected = conn
        .execute(
            "DELETE FROM annotations WHERE id = ?1 AND status != 'synced'",
            params![annotation_id],
        )
        .map_err(|error| error.to_string())?;
    if affected == 0 {
        return Err("Annotation is already synced or does not exist".to_string());
    }
    Ok(())
}

pub fn list_annotations(
    conn: &Connection,
    book_id: Option<&str>,
) -> Result<Vec<Annotation>, String> {
    let sql = if book_id.is_some() {
        format!("{ANNOTATION_SELECT} WHERE book_id = ?1 ORDER BY created_at DESC")
    } else {
        format!("{ANNOTATION_SELECT} ORDER BY created_at DESC")
    };
    let mut stmt = conn.prepare(&sql).map_err(|error| error.to_string())?;
    let rows = if let Some(id) = book_id {
        stmt.query_map(params![id], row_to_annotation)
    } else {
        stmt.query_map([], row_to_annotation)
    }
    .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

pub fn mark_annotation_synced(
    conn: &Connection,
    id: &str,
    note_id: i64,
    updated_at: &str,
) -> Result<(), String> {
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
        .prepare(
            "SELECT name, selected, synced_at FROM anki_decks ORDER BY selected DESC, name ASC",
        )
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

pub fn replace_anki_notes(
    conn: &mut Connection,
    deck_name: &str,
    model_name: &str,
    notes: &[AnkiNote],
    synced_at: &str,
) -> Result<(), String> {
    let tx = conn.transaction().map_err(|error| error.to_string())?;
    tx.execute(
        "DELETE FROM anki_notes WHERE deck_name = ?1",
        params![deck_name],
    )
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
        upsert_vocabulary_from_anki_note(&tx, note, model_name, synced_at)?;
    }
    tx.execute(
        "UPDATE anki_decks SET synced_at = ?2 WHERE name = ?1",
        params![deck_name, synced_at],
    )
    .map_err(|error| error.to_string())?;
    tx.commit().map_err(|error| error.to_string())?;
    Ok(())
}

pub fn search_anki_notes(
    conn: &Connection,
    deck_name: Option<&str>,
    query: Option<&str>,
) -> Result<Vec<AnkiNote>, String> {
    let query = query.unwrap_or("").trim().to_lowercase();
    let deck = deck_name.unwrap_or("").trim();
    let (sql, args): (String, Vec<String>) = match (deck.is_empty(), query.is_empty()) {
        (false, false) => (
            format!(
                "{ANKI_NOTE_SELECT} WHERE deck_name = ?1 AND ({}) ORDER BY word LIMIT 500",
                ANKI_NOTE_SEARCH_FILTER.replace("?1", "?2")
            ),
            vec![deck.to_string(), format!("%{}%", query)],
        ),
        (false, true) => (
            format!("{ANKI_NOTE_SELECT} WHERE deck_name = ?1 ORDER BY word LIMIT 500"),
            vec![deck.to_string()],
        ),
        (true, false) => (
            format!("{ANKI_NOTE_SELECT} WHERE {ANKI_NOTE_SEARCH_FILTER} ORDER BY word LIMIT 500"),
            vec![format!("%{}%", query)],
        ),
        (true, true) => (
            format!("{ANKI_NOTE_SELECT} ORDER BY word LIMIT 500"),
            vec![],
        ),
    };
    let mut stmt = conn.prepare(&sql).map_err(|error| error.to_string())?;
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
    let sql = format!("{ANKI_NOTE_SELECT} WHERE note_id = ?1");
    conn.query_row(&sql, params![note_id], row_to_anki_note)
        .optional()
        .map_err(|error| error.to_string())
}

pub fn list_anki_sync_conflicts(
    conn: &Connection,
    deck_name: Option<&str>,
) -> Result<Vec<AnkiSyncConflict>, String> {
    let annotations = list_annotations(conn, None)?
        .into_iter()
        .filter(|annotation| annotation.status != "synced")
        .collect::<Vec<_>>();
    let notes = search_anki_notes(conn, deck_name, None)?;
    let mut conflicts = Vec::new();
    let mut seen: HashMap<(String, String), String> = HashMap::new();
    let note_by_word_sentence = notes
        .iter()
        .filter_map(|note| {
            Some((
                (
                    normalize_vocabulary_word(&note.word),
                    normalize_sentence(note.sentence.as_deref()?),
                ),
                note,
            ))
        })
        .collect::<HashMap<_, _>>();
    let note_by_word = notes
        .iter()
        .map(|note| (normalize_vocabulary_word(&note.word), note))
        .collect::<HashMap<_, _>>();

    for annotation in annotations {
        let key = (
            normalize_vocabulary_word(&annotation.word),
            normalize_sentence(&annotation.sentence),
        );
        if let Some(first_id) = seen.get(&key) {
            conflicts.push(AnkiSyncConflict {
                annotation_id: annotation.id.clone(),
                word: annotation.word.clone(),
                sentence: annotation.sentence.clone(),
                kind: "duplicate_sentence".to_string(),
                detail: format!("Same word and sentence already queued as {first_id}"),
                anki_note_id: None,
            });
        } else {
            seen.insert(key.clone(), annotation.id.clone());
        }
        if let Some(note) = note_by_word_sentence.get(&key) {
            conflicts.push(AnkiSyncConflict {
                annotation_id: annotation.id.clone(),
                word: annotation.word.clone(),
                sentence: annotation.sentence.clone(),
                kind: "anki_duplicate_sentence".to_string(),
                detail: "Same word and sentence already exist in cached Anki deck".to_string(),
                anki_note_id: Some(note.note_id),
            });
            continue;
        }
        if let Some(note) = note_by_word.get(&key.0) {
            conflicts.push(AnkiSyncConflict {
                annotation_id: annotation.id.clone(),
                word: annotation.word.clone(),
                sentence: annotation.sentence.clone(),
                kind: "anki_existing_word".to_string(),
                detail: "Word exists in cached Anki deck with a different context".to_string(),
                anki_note_id: Some(note.note_id),
            });
        }
    }
    Ok(conflicts)
}

pub fn list_vocabulary(
    conn: &Connection,
    query: Option<&str>,
    book_id: Option<&str>,
) -> Result<Vec<VocabularyEntry>, String> {
    let query = query.unwrap_or("").trim().to_lowercase();
    let book_id = book_id.unwrap_or("").trim();
    let mut filters = Vec::new();
    let mut args = Vec::new();
    if !query.is_empty() {
        filters.push("v.normalized_word LIKE ? OR LOWER(v.display_word) LIKE ?");
        let value = format!("%{}%", query);
        args.push(value.clone());
        args.push(value);
    }
    if !book_id.is_empty() {
        filters.push("EXISTS (SELECT 1 FROM word_occurrences bo WHERE bo.normalized_word = v.normalized_word AND bo.book_id = ?)");
        args.push(book_id.to_string());
    }
    let where_clause = if filters.is_empty() {
        String::new()
    } else {
        format!(" WHERE {}", filters.join(" AND "))
    };
    let sql = format!(
        "{VOCABULARY_SELECT}{where_clause} GROUP BY v.normalized_word ORDER BY v.updated_at DESC LIMIT 500"
    );
    let mut stmt = conn.prepare(&sql).map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(args), row_to_vocabulary_entry)
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

pub fn update_vocabulary_status(
    conn: &Connection,
    word: &str,
    status: &str,
    updated_at: &str,
) -> Result<Option<VocabularyEntry>, String> {
    let normalized = normalize_vocabulary_word(word);
    if normalized.is_empty() {
        return Err("Word is required".to_string());
    }
    let affected = conn
        .execute(
            "UPDATE vocabulary SET status = ?2, updated_at = ?3 WHERE normalized_word = ?1",
            params![normalized, status, updated_at],
        )
        .map_err(|error| error.to_string())?;
    if affected == 0 {
        upsert_vocabulary(
            conn,
            VocabularyUpsert {
                word,
                source: "witt",
                anki_note_id: None,
                deck_name: None,
                model_name: None,
                raw_fields_json: None,
                first_seen_at: updated_at,
                updated_at,
            },
        )?;
        conn.execute(
            "UPDATE vocabulary SET status = ?2, updated_at = ?3 WHERE normalized_word = ?1",
            params![normalize_vocabulary_word(word), status, updated_at],
        )
        .map_err(|error| error.to_string())?;
    }
    get_vocabulary_entry(conn, word)
}

pub fn get_vocabulary_entry(
    conn: &Connection,
    word: &str,
) -> Result<Option<VocabularyEntry>, String> {
    let normalized = normalize_vocabulary_word(word);
    if normalized.is_empty() {
        return Ok(None);
    }
    let sql =
        format!("{VOCABULARY_SELECT} WHERE v.normalized_word = ?1 GROUP BY v.normalized_word");
    conn.query_row(&sql, params![normalized], row_to_vocabulary_entry)
        .optional()
        .map_err(|error| error.to_string())
}

pub fn list_word_occurrences(conn: &Connection, word: &str) -> Result<Vec<WordOccurrence>, String> {
    let normalized = normalize_vocabulary_word(word);
    if normalized.is_empty() {
        return Ok(Vec::new());
    }
    let sql = format!(
        "{OCCURRENCE_SELECT} WHERE normalized_word = ?1 ORDER BY created_at DESC LIMIT 100"
    );
    let mut stmt = conn.prepare(&sql).map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map(params![normalized], row_to_word_occurrence)
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

pub fn list_meaning_groups(conn: &Connection, word: &str) -> Result<Vec<MeaningGroup>, String> {
    let normalized = normalize_vocabulary_word(word);
    if normalized.is_empty() {
        return Ok(Vec::new());
    }
    let sql = format!("{MEANING_GROUP_SELECT} WHERE normalized_word = ?1 ORDER BY updated_at DESC");
    let mut stmt = conn.prepare(&sql).map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map(params![normalized], row_to_meaning_group)
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

pub fn get_dictionary_cache(
    conn: &Connection,
    word: &str,
    prompt_id: Option<&str>,
) -> Result<Option<DictionaryCacheEntry>, String> {
    let normalized = normalize_vocabulary_word(word);
    if normalized.is_empty() {
        return Ok(None);
    }
    let prompt = prompt_id.unwrap_or("").trim();
    let sql = if prompt.is_empty() {
        format!("{DICTIONARY_CACHE_SELECT} WHERE normalized_word = ?1")
    } else {
        format!(
            "{DICTIONARY_CACHE_SELECT} WHERE normalized_word = ?1 AND COALESCE(prompt_id, '') = ?2"
        )
    };
    let result = if prompt.is_empty() {
        conn.query_row(&sql, params![normalized], row_to_dictionary_cache)
    } else {
        conn.query_row(&sql, params![normalized, prompt], row_to_dictionary_cache)
    };
    result.optional().map_err(|error| error.to_string())
}

pub fn save_dictionary_cache(
    conn: &Connection,
    draft: &DictionaryCacheDraft,
    updated_at: &str,
) -> Result<DictionaryCacheEntry, String> {
    let normalized = normalize_vocabulary_word(&draft.word);
    if normalized.is_empty() {
        return Err("Word is required".to_string());
    }
    if draft.meaning.trim().is_empty() {
        return Err("Meaning is required".to_string());
    }
    conn.execute(
        r#"
        INSERT INTO dictionary_cache (normalized_word, display_word, meaning, prompt_id, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(normalized_word) DO UPDATE SET
            display_word = excluded.display_word,
            meaning = excluded.meaning,
            prompt_id = excluded.prompt_id,
            updated_at = excluded.updated_at
        "#,
        params![
            normalized,
            draft.word.trim(),
            draft.meaning.trim(),
            draft.prompt_id.as_deref(),
            updated_at
        ],
    )
    .map_err(|error| error.to_string())?;
    upsert_meaning_group(
        conn,
        &normalized,
        draft.meaning.trim(),
        draft.prompt_id.as_deref().unwrap_or("dictionary_cache"),
        updated_at,
    )?;
    get_dictionary_cache(conn, &draft.word, draft.prompt_id.as_deref())?
        .ok_or_else(|| "Dictionary cache was not saved".to_string())
}

fn upsert_meaning_group(
    conn: &Connection,
    normalized_word: &str,
    meaning: &str,
    source: &str,
    updated_at: &str,
) -> Result<(), String> {
    let id = format!("dictionary:{normalized_word}:{source}");
    conn.execute(
        r#"
        INSERT INTO meaning_groups (id, normalized_word, meaning, source, created_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?5)
        ON CONFLICT(id) DO UPDATE SET
            meaning = excluded.meaning,
            source = excluded.source,
            updated_at = excluded.updated_at
        "#,
        params![id, normalized_word, meaning, source, updated_at],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn upsert_vocabulary_from_annotation(
    conn: &Connection,
    annotation: &Annotation,
) -> Result<(), String> {
    upsert_vocabulary(
        conn,
        VocabularyUpsert {
            word: &annotation.word,
            source: "annotation",
            anki_note_id: annotation.anki_note_id,
            deck_name: None,
            model_name: None,
            raw_fields_json: None,
            first_seen_at: &annotation.created_at,
            updated_at: &annotation.updated_at,
        },
    )?;
    let normalized = normalize_vocabulary_word(&annotation.word);
    if normalized.is_empty() {
        return Ok(());
    }
    conn.execute(
        r#"
        INSERT INTO word_occurrences
        (id, normalized_word, book_id, annotation_id, sentence, chapter_title, epub_cfi, created_at)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(id) DO UPDATE SET
            normalized_word = excluded.normalized_word,
            book_id = excluded.book_id,
            annotation_id = excluded.annotation_id,
            sentence = excluded.sentence,
            chapter_title = excluded.chapter_title,
            epub_cfi = excluded.epub_cfi
        "#,
        params![
            format!("annotation:{}", annotation.id),
            normalized,
            annotation.book_id,
            annotation.id,
            annotation.sentence,
            annotation.chapter_title,
            annotation.epub_cfi,
            annotation.created_at
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn upsert_vocabulary_from_anki_note(
    conn: &Connection,
    note: &AnkiNote,
    model_name: &str,
    updated_at: &str,
) -> Result<(), String> {
    upsert_vocabulary(
        conn,
        VocabularyUpsert {
            word: &note.word,
            source: "anki",
            anki_note_id: Some(note.note_id),
            deck_name: Some(note.deck_name.as_str()),
            model_name: Some(model_name),
            raw_fields_json: Some(note.raw_fields_json.as_str()),
            first_seen_at: updated_at,
            updated_at,
        },
    )
}

struct VocabularyUpsert<'a> {
    word: &'a str,
    source: &'a str,
    anki_note_id: Option<i64>,
    deck_name: Option<&'a str>,
    model_name: Option<&'a str>,
    raw_fields_json: Option<&'a str>,
    first_seen_at: &'a str,
    updated_at: &'a str,
}

fn upsert_vocabulary(conn: &Connection, upsert: VocabularyUpsert<'_>) -> Result<(), String> {
    let normalized = normalize_vocabulary_word(upsert.word);
    if normalized.is_empty() {
        return Ok(());
    }
    conn.execute(
        r#"
        INSERT INTO vocabulary
        (normalized_word, display_word, status, source, anki_note_id, deck_name, model_name, raw_fields_json, first_seen_at, updated_at)
        VALUES (?1, ?2, 'learning', ?3, ?4, ?5, ?6, ?7, ?8, ?9)
        ON CONFLICT(normalized_word) DO UPDATE SET
            display_word = excluded.display_word,
            source = CASE
                WHEN vocabulary.source = 'annotation' THEN vocabulary.source
                ELSE excluded.source
            END,
            anki_note_id = COALESCE(excluded.anki_note_id, vocabulary.anki_note_id),
            deck_name = COALESCE(excluded.deck_name, vocabulary.deck_name),
            model_name = COALESCE(excluded.model_name, vocabulary.model_name),
            raw_fields_json = COALESCE(excluded.raw_fields_json, vocabulary.raw_fields_json),
            updated_at = excluded.updated_at
        "#,
        params![
            normalized,
            upsert.word.trim(),
            upsert.source,
            upsert.anki_note_id,
            upsert.deck_name,
            upsert.model_name,
            upsert.raw_fields_json,
            upsert.first_seen_at,
            upsert.updated_at
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn normalize_vocabulary_word(word: &str) -> String {
    word.trim().to_lowercase()
}

fn normalize_sentence(sentence: &str) -> String {
    sentence
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
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

fn row_to_vocabulary_entry(row: &rusqlite::Row<'_>) -> rusqlite::Result<VocabularyEntry> {
    Ok(VocabularyEntry {
        normalized_word: row.get(0)?,
        display_word: row.get(1)?,
        status: row.get(2)?,
        source: row.get(3)?,
        anki_note_id: row.get(4)?,
        deck_name: row.get(5)?,
        model_name: row.get(6)?,
        raw_fields_json: row.get(7)?,
        cached_meaning: row.get(8)?,
        occurrence_count: row.get(9)?,
        last_seen_at: row.get(10)?,
        first_seen_at: row.get(11)?,
        updated_at: row.get(12)?,
    })
}

fn row_to_word_occurrence(row: &rusqlite::Row<'_>) -> rusqlite::Result<WordOccurrence> {
    Ok(WordOccurrence {
        id: row.get(0)?,
        normalized_word: row.get(1)?,
        book_id: row.get(2)?,
        annotation_id: row.get(3)?,
        sentence: row.get(4)?,
        chapter_title: row.get(5)?,
        epub_cfi: row.get(6)?,
        created_at: row.get(7)?,
    })
}

fn row_to_meaning_group(row: &rusqlite::Row<'_>) -> rusqlite::Result<MeaningGroup> {
    Ok(MeaningGroup {
        id: row.get(0)?,
        normalized_word: row.get(1)?,
        meaning: row.get(2)?,
        source: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn row_to_dictionary_cache(row: &rusqlite::Row<'_>) -> rusqlite::Result<DictionaryCacheEntry> {
    Ok(DictionaryCacheEntry {
        normalized_word: row.get(0)?,
        display_word: row.get(1)?,
        meaning: row.get(2)?,
        prompt_id: row.get(3)?,
        updated_at: row.get(4)?,
    })
}
