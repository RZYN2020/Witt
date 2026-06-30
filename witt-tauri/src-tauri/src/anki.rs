use crate::models::AnkiStatus;

pub use witt_core::anki_connect::{fetch_decks, fetch_models, fetch_notes, sync_anki_web};

pub async fn check_anki(endpoint: &str) -> AnkiStatus {
    witt_core::anki_connect::check_anki(endpoint).await
}
