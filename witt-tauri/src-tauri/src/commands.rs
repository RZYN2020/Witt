use crate::models::*;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;
use witt_core::{WittCore, WittConfig, Note, note::Context, note::NoteUpdate};

pub struct WittCoreState {
    pub core: tokio::sync::Mutex<Option<WittCore>>,
}

impl Default for WittCoreState {
    fn default() -> Self {
        Self {
            core: tokio::sync::Mutex::new(None),
        }
    }
}

/// Initialize WittCore
#[tauri::command]
pub async fn init_core(state: State<'_, WittCoreState>) -> Result<(), String> {
    let mut core = state.core.lock().await;
    if core.is_none() {
        let config = WittConfig::default();
        *core = Some(
            WittCore::new_with_config(config.clone())
                .await
                .map_err(|e| {
                    format!(
                        "{} (db_path: {}, media_dir: {})",
                        e,
                        config.db_path.display(),
                        config.media_dir.display()
                    )
                })?,
        );
    }
    Ok(())
}

/// Get all notes with optional filtering
#[tauri::command]
pub async fn get_notes(
    state: State<'_, WittCoreState>,
    filter: Option<NoteFilter>,
) -> Result<Vec<Note>, String> {
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
                    // Spec expects 30 days
                    note.created_at >= now - chrono::Duration::days(30)
                }
                TimeRange::All => true,
            });
        }

        // Filter by source type (web/video/pdf/app)
        if let Some(source_filter) = f.source.as_ref() {
            let wanted = source_filter.to_lowercase();
            notes.retain(|note| {
                note.contexts.iter().any(|ctx| {
                    let ty = match &ctx.source {
                        witt_core::note::Source::Web { .. } => "web",
                        witt_core::note::Source::Video { .. } => "video",
                        witt_core::note::Source::Pdf { .. } => "pdf",
                        witt_core::note::Source::App { .. } => "app",
                    };
                    ty == wanted
                })
            });
        }

        // Filter by tags (require all selected tags)
        if !f.tags.is_empty() {
            let wanted_tags: Vec<String> = f.tags.iter().map(|t| t.to_lowercase()).collect();
            notes.retain(|note| {
                wanted_tags
                    .iter()
                    .all(|t| note.tags.iter().any(|nt| nt.to_lowercase() == *t))
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
    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let mut note = core.db().get_note_by_lemma(&lemma).await.map_err(|e| e.to_string())?.ok_or_else(|| "Note not found".to_string())?;

    note.remove_context(&context_id).map_err(|e| e.to_string())?;
    core.db().save_note(&note).await.map_err(|e| e.to_string())?;

    Ok(())
}

/// Get dictionary definitions for a word
#[tauri::command]
pub async fn get_definitions(
    _state: State<'_, WittCoreState>,
    request: DefinitionRequest,
) -> Result<Vec<Definition>, String> {
    fetch_dictionary_definitions(&request.word, &request.language).await
}

/// Get lemma for a word
#[tauri::command]
pub async fn get_lemma(
    _state: State<'_, WittCoreState>,
    request: LemmaRequest,
) -> Result<String, String> {
    Ok(extract_lemma(&request.word, &request.language))
}

/// Get tag suggestions
#[tauri::command]
pub async fn get_tag_suggestions(
    state: State<'_, WittCoreState>,
    prefix: String,
) -> Result<Vec<String>, String> {
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

/// Best-effort: simulate a system copy shortcut to capture current selection.
///
/// - macOS: sends Cmd+C via AppleScript (requires Accessibility permission)
/// - other platforms: returns Ok(false)
#[tauri::command]
pub async fn simulate_copy_shortcut() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;

        let status = Command::new("osascript")
            .arg("-e")
            .arg("tell application \"System Events\" to keystroke \"c\" using {command down}")
            .status()
            .map_err(|e| format!("failed to run osascript: {}", e))?;

        if status.success() {
            Ok(true)
        } else {
            Err(format!("osascript failed with status: {}", status))
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(false)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlobalCursorPosition {
    pub x: i32,
    pub y: i32,
}

/// Get system/global cursor position in screen coordinates.
///
/// Used for positioning the capture popup near the mouse even when the app is not focused.
#[tauri::command]
pub async fn get_global_cursor_position() -> Result<GlobalCursorPosition, String> {
    use device_query::{DeviceQuery, DeviceState};

    let device_state = DeviceState::new();
    let mouse = device_state.get_mouse();
    Ok(GlobalCursorPosition {
        x: mouse.coords.0,
        y: mouse.coords.1,
    })
}

// ============================================================================
// Real AnkiConnect Integration Commands
// ============================================================================

/// Check AnkiConnect connection
#[tauri::command]
pub async fn check_anki_connect() -> Result<AnkiConnectStatus, String> {
    let anki_client = witt_core::anki::AnkiClient::new();
    
    match anki_client.is_available().await {
        true => {
            let version = anki_client.version().await.unwrap_or(0);
            Ok(AnkiConnectStatus {
                available: true,
                version: Some(version),
            })
        }
        false => Ok(AnkiConnectStatus {
            available: false,
            version: None,
        })
    }
}

/// AnkiConnect status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnkiConnectStatus {
    pub available: bool,
    pub version: Option<u32>,
}

/// Get available decks from Anki
#[tauri::command]
pub async fn get_anki_decks() -> Result<Vec<String>, String> {
    let anki_client = witt_core::anki::AnkiClient::new();
    
    // Get deck names from AnkiConnect
    let result = anki_client
        .get_deck_names()
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(result)
}

/// Sync notes to Anki
#[tauri::command]
pub async fn sync_to_anki(
    state: State<'_, WittCoreState>,
    lemmas: Vec<String>,
) -> Result<AnkiSyncResult, String> {
    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;
    
    let anki_client = witt_core::anki::AnkiClient::new();
    
    // Fetch notes by lemmas
    let mut notes = Vec::new();
    for lemma in &lemmas {
        if let Some(note) = core.db().get_note_by_lemma(lemma).await.map_err(|e| e.to_string())? {
            notes.push(note);
        }
    }
    
    // Sync to Anki
    let sync_result = anki_client.sync_notes(&notes).await.map_err(|e| e.to_string())?;
    
    Ok(AnkiSyncResult {
        success: sync_result.success,
        created: sync_result.created,
        updated: sync_result.updated,
        failed: sync_result.failed.into_iter().map(|e| SyncError {
            lemma: e.lemma,
            error: e.error,
        }).collect(),
    })
}

/// Anki sync result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnkiSyncResult {
    pub success: bool,
    pub created: usize,
    pub updated: usize,
    pub failed: Vec<SyncError>,
}

/// Sync error
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncError {
    pub lemma: String,
    pub error: String,
}

/// Export notes to APKG
#[tauri::command]
pub async fn export_to_apkg(
    state: State<'_, WittCoreState>,
    lemmas: Vec<String>,
    output_path: String,
) -> Result<String, String> {
    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;
    
    // Fetch notes by lemmas
    let mut notes = Vec::new();
    for lemma in &lemmas {
        if let Some(note) = core.db().get_note_by_lemma(lemma).await.map_err(|e| e.to_string())? {
            notes.push(note);
        }
    }
    
    // Generate APKG
    let output = std::path::Path::new(&output_path);
    witt_core::anki::AnkiClient::generate_apkg(notes, output)
        .map_err(|e| e.to_string())?;
    
    Ok(output_path)
}

// ============================================================================
// Real Dictionary API Integration
// ============================================================================

/// Fetch definitions from Free Dictionary API
async fn fetch_dictionary_definitions(word: &str, language: &str) -> Result<Vec<Definition>, String> {
    let client = reqwest::Client::new();
    
    // Use Free Dictionary API (https://dictionaryapi.dev/)
    let url = format!("https://api.dictionaryapi.dev/api/v2/entries/{}/{}", language, word);
    
    match client.get(&url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(data) => {
                        if let Some(entries) = data.as_array() {
                            let mut definitions = Vec::new();
                            
                            for entry in entries {
                                if let Some(meanings) = entry.get("meanings").and_then(|m| m.as_array()) {
                                    for meaning in meanings {
                                        let part_of_speech = meaning.get("partOfSpeech")
                                            .and_then(|p| p.as_str())
                                            .map(String::from);
                                        
                                        if let Some(defs) = meaning.get("definitions").and_then(|d| d.as_array()) {
                                            for def in defs.iter().take(3) {
                                                let text = def.get("definition")
                                                    .and_then(|d| d.as_str())
                                                    .unwrap_or("No definition")
                                                    .to_string();
                                                
                                                let source = def.get("source")
                                                    .and_then(|s| s.as_str())
                                                    .unwrap_or("Free Dictionary API")
                                                    .to_string();
                                                
                                                definitions.push(Definition {
                                                    id: Uuid::new_v4(),
                                                    text,
                                                    source,
                                                    part_of_speech: part_of_speech.clone(),
                                                    is_custom: false,
                                                    is_user_edited: false,
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                            
                            if !definitions.is_empty() {
                                return Ok(definitions);
                            }
                        }
                    }
                    Err(e) => log::warn!("Failed to parse dictionary response: {}", e),
                }
            }
        }
        Err(e) => log::warn!("Failed to fetch dictionary: {}", e),
    }
    
    // Fallback: return a placeholder definition
    Ok(vec![Definition {
        id: Uuid::new_v4(),
        text: format!("No dictionary definition found for '{}'. You can add a custom definition.", word),
        source: String::from("Fallback"),
        part_of_speech: None,
        is_custom: false,
        is_user_edited: false,
    }])
}

// ============================================================================
// Lemma Extraction using rust-stemmers
// ============================================================================

/// Extract lemma (base form) of a word using stemming
fn extract_lemma(word: &str, language: &str) -> String {
    use rust_stemmers::Algorithm;
    
    let algorithm = match language {
        "en" => Algorithm::English,
        "de" => Algorithm::German,
        "fr" => Algorithm::French,
        "es" => Algorithm::Spanish,
        "it" => Algorithm::Italian,
        "pt" => Algorithm::Portuguese,
        "nl" => Algorithm::Dutch,
        "ru" => Algorithm::Russian,
        _ => Algorithm::English, // Default to English
    };
    
    let stemmer = rust_stemmers::Stemmer::create(algorithm);
    let stemmed = stemmer.stem(word);
    
    // Return stemmed word in lowercase
    stemmed.to_lowercase()
}

// ============================================================================
// Optimized Response Format Commands
// ============================================================================

/// Get notes with optimized response format (supports pagination)
#[tauri::command]
pub async fn get_notes_paginated(
    state: State<'_, WittCoreState>,
    page: usize,
    page_size: usize,
    filter: Option<NoteFilter>,
) -> Result<PaginatedResponse<NoteSummary>, String> {
    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let mut notes = core.db().get_all_notes().await.map_err(|e| e.to_string())?;
    let total = notes.len();

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

    // Apply pagination
    let start = page * page_size;
    let end = (start + page_size).min(notes.len());
    let page_notes = if start < notes.len() {
        notes[start..end].iter().map(NoteSummary::from).collect()
    } else {
        Vec::new()
    };

    Ok(PaginatedResponse::new(page_notes, total, page, page_size))
}

/// Batch save multiple notes
#[tauri::command]
pub async fn batch_save_notes(
    state: State<'_, WittCoreState>,
    request: BatchNoteRequest,
) -> Result<BatchResult, String> {
    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let mut successful = Vec::new();
    let mut failed = Vec::new();

    for (index, note_req) in request.notes.into_iter().enumerate() {
        let lemma = note_req.lemma.clone();
        
        match core.db().save_note(&Note::new_with_context(
            note_req.lemma,
            note_req.definition,
            note_req.pronunciation,
            note_req.phonetics,
            note_req.tags,
            note_req.comment.unwrap_or_default(),
            note_req.deck.unwrap_or_else(|| "Default".to_string()),
            note_req.context,
        )).await {
            Ok(_) => successful.push(lemma),
            Err(e) => failed.push(BatchError {
                index,
                lemma,
                error: e.to_string(),
            }),
        }
    }

    Ok(BatchResult { successful, failed })
}

/// Get note summaries for efficient list rendering
#[tauri::command]
pub async fn get_note_summaries(
    state: State<'_, WittCoreState>,
    lemmas: Vec<String>,
) -> Result<Vec<NoteSummary>, String> {
    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let mut summaries = Vec::new();
    for lemma in lemmas {
        if let Some(note) = core.db().get_note_by_lemma(&lemma).await.map_err(|e| e.to_string())? {
            summaries.push(NoteSummary::from(&note));
        }
    }

    Ok(summaries)
}

/// Bulk delete multiple notes
#[tauri::command]
pub async fn bulk_delete_notes(
    state: State<'_, WittCoreState>,
    lemmas: Vec<String>,
) -> Result<BatchResult, String> {
    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let mut successful = Vec::new();
    let mut failed = Vec::new();

    for (index, lemma) in lemmas.into_iter().enumerate() {
        match core.db().delete_note(&lemma).await {
            Ok(_) => successful.push(lemma),
            Err(e) => failed.push(BatchError {
                index,
                lemma: String::new(),
                error: e.to_string(),
            }),
        }
    }

    Ok(BatchResult { successful, failed })
}

/// Get application statistics
#[tauri::command]
pub async fn get_stats(
    state: State<'_, WittCoreState>,
) -> Result<AppStats, String> {
    let core = state.core.lock().await;
    let core = core.as_ref().ok_or_else(|| "WittCore not initialized".to_string())?;

    let notes = core.db().get_all_notes().await.map_err(|e| e.to_string())?;
    let total_notes = notes.len();
    let total_contexts: usize = notes.iter().map(|n| n.contexts.len()).sum();
    let unique_tags: std::collections::HashSet<_> = notes.iter().flat_map(|n| &n.tags).collect();
    
    Ok(AppStats {
        total_notes,
        total_contexts,
        unique_tags: unique_tags.len(),
        notes_with_contexts: notes.iter().filter(|n| !n.contexts.is_empty()).count(),
    })
}

/// Application statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppStats {
    pub total_notes: usize,
    pub total_contexts: usize,
    pub unique_tags: usize,
    pub notes_with_contexts: usize,
}
