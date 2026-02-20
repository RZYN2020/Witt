use crate::models::*;
use chrono::Utc;
use std::time::Duration;
use tauri::State;
use tokio::time::sleep;
use uuid::Uuid;
use rand::Rng;
use witt_core::{WittCore, WittConfig, Note, note::Context, note::NoteUpdate};

pub struct WittCoreState {
    pub core: tokio::sync::Mutex<Option<WittCore>>,
}

/// Initialize WittCore
#[tauri::command]
pub async fn init_core(state: State<'_, WittCoreState>) -> Result<(), String> {
    let mut core = state.core.lock().await;
    if core.is_none() {
        let config = WittConfig::default();
        *core = Some(WittCore::new_with_config(config).await.map_err(|e| e.to_string())?);
    }
    Ok(())
}

/// Simulate async delay for realistic UI behavior
async fn fake_delay(min_ms: u64, max_ms: u64) {
    let delay = rand::thread_rng().gen_range(min_ms..max_ms);
    sleep(Duration::from_millis(delay)).await;
}

/// Get all notes with optional filtering
#[tauri::command]
pub async fn get_notes(
    state: State<'_, WittCoreState>,
    filter: Option<NoteFilter>,
) -> Result<Vec<Note>, String> {
    fake_delay(50, 150).await;

    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let mut notes = core.db().get_all_notes().await.map_err(|e| e.to_string())?;

    // Apply filters if provided
    if let Some(f) = filter {
        if let Some(time_range) = f.time_range {
            let now = Utc::now();
            notes.retain(|note| match time_range {
                TimeRange::Today => note.created_at.date_naive() == now.date_naive(),
                TimeRange::ThisWeek => {
                    note.created_at >= now - chrono::Duration::weeks(1)
                }
                TimeRange::ThisMonth => {
                    note.created_at >= now - chrono::Duration::weeks(4)
                }
                TimeRange::All => true,
            });
        }

        if let Some(search) = f.search_query {
            let query = search.to_lowercase();
            notes.retain(|note| {
                note.lemma.to_lowercase().contains(&query)
                    || note.definition.to_lowercase().contains(&query)
                    || note.contexts.iter().any(|ctx| ctx.word_form.to_lowercase().contains(&query) || ctx.sentence.to_lowercase().contains(&query))
                    || note.tags.iter().any(|t| t.to_lowercase().contains(&query))
            });
        }
    }

    // Sort by created_at descending
    notes.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(notes)
}

/// Get a single note by lemma
#[tauri::command]
pub async fn get_note(
    state: State<'_, WittCoreState>,
    lemma: String,
) -> Result<Note, String> {
    fake_delay(30, 80).await;

    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    core.db().get_note_by_lemma(&lemma).await.map_err(|e| e.to_string())?.ok_or_else(|| "Note not found".to_string())
}

/// Save a new note
#[tauri::command]
pub async fn save_note(
    state: State<'_, WittCoreState>,
    request: NoteRequest,
) -> Result<String, String> {
    fake_delay(100, 200).await;

    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let note = Note::new_with_context(
        request.lemma,
        request.definition,
        request.pronunciation,
        request.phonetics,
        request.tags,
        request.comment.unwrap_or_default(),
        request.deck.unwrap_or_else(|| "Default".to_string()),
        request.context,
    );

    core.db().save_note(&note).await.map_err(|e| e.to_string())?;
    Ok(note.lemma)
}

/// Update an existing note
#[tauri::command]
pub async fn update_note(
    state: State<'_, WittCoreState>,
    lemma: String,
    updates: NoteUpdate,
) -> Result<Note, String> {
    fake_delay(100, 200).await;

    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let mut note = core.db().get_note_by_lemma(&lemma).await.map_err(|e| e.to_string())?.ok_or_else(|| "Note not found".to_string())?;

    // Apply updates
    if let Some(definition) = updates.definition {
        note.definition = definition;
    }
    if let Some(pronunciation) = updates.pronunciation {
        note.pronunciation = pronunciation;
    }
    if let Some(phonetics) = updates.phonetics {
        note.phonetics = phonetics;
    }
    if let Some(tags) = updates.tags {
        note.tags = tags;
    }
    if let Some(comment) = updates.comment {
        note.comment = comment;
    }
    if let Some(deck) = updates.deck {
        note.deck = deck;
    }

    core.db().save_note(&note).await.map_err(|e| e.to_string())?;
    Ok(note)
}

/// Delete a note
#[tauri::command]
pub async fn delete_note(
    state: State<'_, WittCoreState>,
    lemma: String,
) -> Result<(), String> {
    fake_delay(50, 150).await;

    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    core.db().delete_note(&lemma).await.map_err(|e| e.to_string())?;
    Ok(())
}

/// Search notes by query
#[tauri::command]
pub async fn search_notes(
    state: State<'_, WittCoreState>,
    query: String,
) -> Result<Vec<Note>, String> {
    fake_delay(100, 200).await;

    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    core.db().search_notes(&query).await.map_err(|e| e.to_string())
}

/// Get all contexts
#[tauri::command]
pub async fn get_contexts(
    state: State<'_, WittCoreState>,
    lemma: String,
) -> Result<Vec<Context>, String> {
    fake_delay(50, 150).await;

    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let note = core.db().get_note_by_lemma(&lemma).await.map_err(|e| e.to_string())?.ok_or_else(|| "Note not found".to_string())?;
    Ok(note.contexts)
}

/// Save a new context
#[tauri::command]
pub async fn save_context(
    state: State<'_, WittCoreState>,
    lemma: String,
    context: Context,
) -> Result<Uuid, String> {
    fake_delay(100, 200).await;

    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let mut note = core.db().get_note_by_lemma(&lemma).await.map_err(|e| e.to_string())?.ok_or_else(|| "Note not found".to_string())?;

    note.add_context(context.clone()).map_err(|e| e.to_string())?;
    core.db().save_note(&note).await.map_err(|e| e.to_string())?;

    Ok(context.id)
}

/// Update an existing context
#[tauri::command]
pub async fn update_context(
    state: State<'_, WittCoreState>,
    lemma: String,
    context: Context,
) -> Result<Context, String> {
    fake_delay(100, 200).await;

    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let mut note = core.db().get_note_by_lemma(&lemma).await.map_err(|e| e.to_string())?.ok_or_else(|| "Note not found".to_string())?;

    note.update_context(context.clone()).map_err(|e| e.to_string())?;
    core.db().save_note(&note).await.map_err(|e| e.to_string())?;

    Ok(context)
}

/// Delete a context
#[tauri::command]
pub async fn delete_context(
    state: State<'_, WittCoreState>,
    lemma: String,
    context_id: Uuid,
) -> Result<(), String> {
    fake_delay(50, 150).await;

    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let mut note = core.db().get_note_by_lemma(&lemma).await.map_err(|e| e.to_string())?.ok_or_else(|| "Note not found".to_string())?;

    note.remove_context(&context_id).map_err(|e| e.to_string())?;
    core.db().save_note(&note).await.map_err(|e| e.to_string())?;

    Ok(())
}

/// Get dictionary definitions for a word (mock)
#[tauri::command]
pub async fn get_definitions(
    _state: State<'_, WittCoreState>,
    request: DefinitionRequest,
) -> Result<Vec<Definition>, String> {
    fake_delay(50, 150).await;

    // Mock dictionary responses based on language
    let definitions = match request.language.as_str() {
        "en" => mock_english_definitions(&request.word),
        "de" => mock_german_definitions(&request.word),
        "ja" => mock_japanese_definitions(&request.word),
        "ko" => mock_korean_definitions(&request.word),
        "zh" => mock_chinese_definitions(&request.word),
        _ => mock_fallback_definitions(&request.word),
    };

    Ok(definitions)
}

/// Get lemma for a word (mock)
#[tauri::command]
pub async fn get_lemma(
    _state: State<'_, WittCoreState>,
    request: LemmaRequest,
) -> Result<String, String> {
    fake_delay(30, 80).await;

    // Simple mock lemmatization
    let lemma = match request.language.as_str() {
        "en" => mock_english_lemma(&request.word),
        "de" => mock_german_lemma(&request.word),
        _ => request.word.clone(), // Fallback: return as-is
    };

    Ok(lemma)
}

/// Get tag suggestions
#[tauri::command]
pub async fn get_tag_suggestions(
    state: State<'_, WittCoreState>,
    prefix: String,
) -> Result<Vec<String>, String> {
    fake_delay(30, 100).await;

    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let notes = core.db().get_all_notes().await.map_err(|e| e.to_string())?;
    let mut tags = Vec::new();
    for note in notes {
        for tag in note.tags {
            if tag.to_lowercase().starts_with(&prefix.to_lowercase()) && !tags.contains(&tag) {
                tags.push(tag);
            }
        }
    }
    tags.sort();
    Ok(tags)
}

// Mock dictionary helpers

fn mock_english_definitions(word: &str) -> Vec<Definition> {
    let word_lower = word.to_lowercase();

    match word_lower.as_str() {
        "bank" => vec![
            Definition {
                id: Uuid::new_v4(),
                text: String::from("sloping land beside a river or lake"),
                source: String::from("Wiktionary"),
                part_of_speech: Some(String::from("noun")),
                is_custom: false,
                is_user_edited: false,
            },
            Definition {
                id: Uuid::new_v4(),
                text: String::from("a financial institution"),
                source: String::from("Wiktionary"),
                part_of_speech: Some(String::from("noun")),
                is_custom: false,
                is_user_edited: false,
            },
            Definition {
                id: Uuid::new_v4(),
                text: String::from("a supply or stock held in reserve"),
                source: String::from("Wiktionary"),
                part_of_speech: Some(String::from("noun")),
                is_custom: false,
                is_user_edited: false,
            },
        ],
        "run" => vec![
            Definition {
                id: Uuid::new_v4(),
                text: String::from("move at a speed faster than a walk"),
                source: String::from("Wiktionary"),
                part_of_speech: Some(String::from("verb")),
                is_custom: false,
                is_user_edited: false,
            },
            Definition {
                id: Uuid::new_v4(),
                text: String::from("to manage or operate"),
                source: String::from("Wiktionary"),
                part_of_speech: Some(String::from("verb")),
                is_custom: false,
                is_user_edited: false,
            },
        ],
        "set" => vec![
            Definition {
                id: Uuid::new_v4(),
                text: String::from("to put something in a particular place"),
                source: String::from("Wiktionary"),
                part_of_speech: Some(String::from("verb")),
                is_custom: false,
                is_user_edited: false,
            },
            Definition {
                id: Uuid::new_v4(),
                text: String::from("to go down below the horizon"),
                source: String::from("Wiktionary"),
                part_of_speech: Some(String::from("verb")),
                is_custom: false,
                is_user_edited: false,
            },
            Definition {
                id: Uuid::new_v4(),
                text: String::from("a group or collection of things"),
                source: String::from("Wiktionary"),
                part_of_speech: Some(String::from("noun")),
                is_custom: false,
                is_user_edited: false,
            },
        ],
        _ => vec![
            Definition {
                id: Uuid::new_v4(),
                text: format!("Definition for '{}'", word),
                source: String::from("Wiktionary"),
                part_of_speech: None,
                is_custom: false,
                is_user_edited: false,
            },
        ],
    }
}

fn mock_german_definitions(word: &str) -> Vec<Definition> {
    vec![
        Definition {
            id: Uuid::new_v4(),
            text: format!("Definition für '{}'", word),
            source: String::from("Dict.cc"),
            part_of_speech: None,
            is_custom: false,
            is_user_edited: false,
        },
    ]
}

fn mock_japanese_definitions(word: &str) -> Vec<Definition> {
    vec![
        Definition {
            id: Uuid::new_v4(),
            text: format!("'{}' の定義", word),
            source: String::from("Jisho"),
            part_of_speech: None,
            is_custom: false,
            is_user_edited: false,
        },
    ]
}

fn mock_korean_definitions(word: &str) -> Vec<Definition> {
    vec![
        Definition {
            id: Uuid::new_v4(),
            text: format!("'{}' 의 정의", word),
            source: String::from("Naver Dictionary"),
            part_of_speech: None,
            is_custom: false,
            is_user_edited: false,
        },
    ]
}

fn mock_chinese_definitions(word: &str) -> Vec<Definition> {
    vec![
        Definition {
            id: Uuid::new_v4(),
            text: format!("'{}' 的定义", word),
            source: String::from("CEDICT"),
            part_of_speech: None,
            is_custom: false,
            is_user_edited: false,
        },
    ]
}

fn mock_fallback_definitions(word: &str) -> Vec<Definition> {
    vec![
        Definition {
            id: Uuid::new_v4(),
            text: format!("No dictionary definition available for '{}'", word),
            source: String::from("Fallback"),
            part_of_speech: None,
            is_custom: false,
            is_user_edited: false,
        },
    ]
}

// Mock lemma helpers

fn mock_english_lemma(word: &str) -> String {
    let word_lower = word.to_lowercase();

    // Simple rule-based lemmatization
    if word_lower.ends_with("ing") {
        // running -> run
        word_lower[..word_lower.len() - 3].to_string()
    } else if word_lower.ends_with("ed") {
        // walked -> walk
        word_lower[..word_lower.len() - 2].to_string()
    } else if word_lower.ends_with("s") && !word_lower.ends_with("ss") {
        // runs -> run
        word_lower[..word_lower.len() - 1].to_string()
    } else {
        word_lower
    }
}

fn mock_german_lemma(word: &str) -> String {
    // Very simplified German lemmatization
    let word_lower = word.to_lowercase();

    if word_lower.ends_with("en") {
        // laufen -> lauf (infinitive removal)
        word_lower[..word_lower.len() - 2].to_string()
    } else {
        word_lower
    }
}
