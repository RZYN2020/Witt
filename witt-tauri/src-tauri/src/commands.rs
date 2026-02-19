use crate::models::*;
use crate::mock_store::StoreState;
use chrono::Utc;
use std::time::Duration;
use tauri::State;
use tokio::time::sleep;
use uuid::Uuid;
use rand::Rng;

/// Simulate async delay for realistic UI behavior
async fn fake_delay(min_ms: u64, max_ms: u64) {
    let delay = rand::thread_rng().gen_range(min_ms..max_ms);
    sleep(Duration::from_millis(delay)).await;
}

/// Get all library cards with optional filtering
#[tauri::command]
pub async fn get_library_cards(
    state: State<'_, StoreState>,
    filter: Option<LibraryFilter>,
) -> Result<Vec<Card>, String> {
    fake_delay(50, 150).await;
    
    let store = state.store.read().map_err(|e| e.to_string())?;
    let mut cards = store.get_all_cards();
    
    // Apply filters if provided
    if let Some(f) = filter {
        if let Some(time_range) = f.time_range {
            let now = Utc::now();
            cards.retain(|card| match time_range {
                TimeRange::Today => card.created_at.date_naive() == now.date_naive(),
                TimeRange::ThisWeek => {
                    card.created_at >= now - chrono::Duration::weeks(1)
                }
                TimeRange::ThisMonth => {
                    card.created_at >= now - chrono::Duration::weeks(4)
                }
                TimeRange::All => true,
            });
        }
        
        if let Some(search) = f.search_query {
            let query = search.to_lowercase();
            cards.retain(|card| {
                card.word.to_lowercase().contains(&query)
                    || card.context.to_lowercase().contains(&query)
                    || card.tags.iter().any(|t| t.to_lowercase().contains(&query))
            });
        }
    }
    
    // Sort by created_at descending
    cards.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    
    Ok(cards)
}

/// Get a single card by ID
#[tauri::command]
pub async fn get_card(state: State<'_, StoreState>, id: Uuid) -> Result<Card, String> {
    fake_delay(30, 80).await;
    
    let store = state.store.read().map_err(|e| e.to_string())?;
    store.get_card(id).ok_or_else(|| "Card not found".to_string())
}

/// Save a new capture
#[tauri::command]
pub async fn save_capture(
    state: State<'_, StoreState>,
    request: CaptureRequest,
) -> Result<Uuid, String> {
    fake_delay(100, 200).await;
    
    let mut store = state.store.write().map_err(|e| e.to_string())?;
    
    let lemma = request.lemma.unwrap_or_else(|| request.word.clone());
    let language = request.language.unwrap_or_else(|| String::from("en"));
    
    let card = Card {
        id: Uuid::new_v4(),
        word: request.word,
        lemma,
        context: request.context,
        definitions: vec![],
        tags: request.tags,
        source: request.source,
        notes: request.notes,
        language,
        created_at: Utc::now(),
        updated_at: None,
    };
    
    Ok(store.add_card(card))
}

/// Update an existing card
#[tauri::command]
pub async fn update_card(
    state: State<'_, StoreState>,
    id: Uuid,
    updates: Card,
) -> Result<Card, String> {
    fake_delay(100, 200).await;
    
    let mut store = state.store.write().map_err(|e| e.to_string())?;
    
    let mut card = store.update_card(id, updates).ok_or("Card not found")?;
    card.updated_at = Some(Utc::now());
    
    Ok(card)
}

/// Delete a card
#[tauri::command]
pub async fn delete_card(state: State<'_, StoreState>, id: Uuid) -> Result<(), String> {
    fake_delay(50, 150).await;
    
    let mut store = state.store.write().map_err(|e| e.to_string())?;
    store.delete_card(id);
    Ok(())
}

/// Search cards by query
#[tauri::command]
pub async fn search_cards(
    state: State<'_, StoreState>,
    query: String,
) -> Result<Vec<Card>, String> {
    fake_delay(100, 200).await;
    
    let store = state.store.read().map_err(|e| e.to_string())?;
    Ok(store.search_cards(&query))
}

/// Get dictionary definitions for a word (mock)
#[tauri::command]
pub async fn get_definitions(
    _state: State<'_, StoreState>,
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
    _state: State<'_, StoreState>,
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
    state: State<'_, StoreState>,
    prefix: String,
) -> Result<Vec<String>, String> {
    fake_delay(30, 100).await;
    
    let store = state.store.read().map_err(|e| e.to_string())?;
    Ok(store.get_tag_suggestions(&prefix))
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
