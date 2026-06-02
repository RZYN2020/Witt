use crate::models::AppSettings;
use rusqlite::{params, Connection, OptionalExtension};

pub fn get_settings(conn: &Connection) -> Result<AppSettings, String> {
    let defaults = AppSettings::default();
    Ok(AppSettings {
        llm_endpoint: get_setting(conn, "llm_endpoint")?.unwrap_or(defaults.llm_endpoint),
        llm_model: get_setting(conn, "llm_model")?.unwrap_or(defaults.llm_model),
        llm_prompt_id: get_setting(conn, "llm_prompt_id")?.unwrap_or(defaults.llm_prompt_id),
        anki_endpoint: get_setting(conn, "anki_endpoint")?.unwrap_or(defaults.anki_endpoint),
        anki_model_name: get_setting(conn, "anki_model_name")?.unwrap_or(defaults.anki_model_name),
        anki_word_field: get_setting(conn, "anki_word_field")?.unwrap_or(defaults.anki_word_field),
        anki_sentence_field: get_setting(conn, "anki_sentence_field")?
            .unwrap_or(defaults.anki_sentence_field),
        anki_book_field: get_setting(conn, "anki_book_field")?.unwrap_or(defaults.anki_book_field),
        anki_chapter_field: get_setting(conn, "anki_chapter_field")?
            .unwrap_or(defaults.anki_chapter_field),
        anki_meaning_field: get_setting(conn, "anki_meaning_field")?
            .unwrap_or(defaults.anki_meaning_field),
        anki_preprocess_mode: get_setting(conn, "anki_preprocess_mode")?
            .unwrap_or(defaults.anki_preprocess_mode),
        anki_pipeline_id: get_setting(conn, "anki_pipeline_id")?
            .unwrap_or(defaults.anki_pipeline_id),
        anki_preprocess_template: get_setting(conn, "anki_preprocess_template")?
            .unwrap_or(defaults.anki_preprocess_template),
        anki_preprocess_prompt: get_setting(conn, "anki_preprocess_prompt")?
            .unwrap_or(defaults.anki_preprocess_prompt),
        selection_auto_ask_ai: get_setting(conn, "selection_auto_ask_ai")?
            .map(|value| value == "true")
            .unwrap_or(defaults.selection_auto_ask_ai),
        vocabulary_backend_mode: get_setting(conn, "vocabulary_backend_mode")?
            .unwrap_or(defaults.vocabulary_backend_mode),
    })
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )
    .optional()
    .map_err(|error| error.to_string())
}

pub fn save_settings(conn: &Connection, settings: &AppSettings) -> Result<(), String> {
    set_setting(conn, "llm_endpoint", &settings.llm_endpoint)?;
    set_setting(conn, "llm_model", &settings.llm_model)?;
    set_setting(conn, "llm_prompt_id", &settings.llm_prompt_id)?;
    set_setting(conn, "anki_endpoint", &settings.anki_endpoint)?;
    set_setting(conn, "anki_model_name", &settings.anki_model_name)?;
    set_setting(conn, "anki_word_field", &settings.anki_word_field)?;
    set_setting(conn, "anki_sentence_field", &settings.anki_sentence_field)?;
    set_setting(conn, "anki_book_field", &settings.anki_book_field)?;
    set_setting(conn, "anki_chapter_field", &settings.anki_chapter_field)?;
    set_setting(conn, "anki_meaning_field", &settings.anki_meaning_field)?;
    set_setting(conn, "anki_preprocess_mode", &settings.anki_preprocess_mode)?;
    set_setting(conn, "anki_pipeline_id", &settings.anki_pipeline_id)?;
    set_setting(
        conn,
        "anki_preprocess_template",
        &settings.anki_preprocess_template,
    )?;
    set_setting(
        conn,
        "anki_preprocess_prompt",
        &settings.anki_preprocess_prompt,
    )?;
    set_setting(
        conn,
        "selection_auto_ask_ai",
        if settings.selection_auto_ask_ai {
            "true"
        } else {
            "false"
        },
    )?;
    set_setting(
        conn,
        "vocabulary_backend_mode",
        &settings.vocabulary_backend_mode,
    )?;
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
