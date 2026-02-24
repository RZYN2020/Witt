use tempfile::tempdir;
use witt_core::{SqliteDb, InboxItem};
use chrono::TimeZone;

#[tokio::test]
async fn add_and_list_inbox_items() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("witt.db");
    let db = SqliteDb::connect(&db_path).await.unwrap();

    let item = InboxItem::new(
        "A quick brown fox jumps over the lazy dog.".to_string(),
        witt_core::note::Source::App {
            name: "Test".to_string(),
            title: None,
        },
    );
    db.add_inbox_item(&item).await.unwrap();

    let (items, total) = db
        .get_inbox_items_page(0, 10, None, None, Some(false), None, None)
        .await
        .unwrap();

    assert_eq!(total, 1);
    assert_eq!(items.len(), 1);
    assert_eq!(items[0].id, item.id);
    assert_eq!(items[0].processed, false);
}

#[tokio::test]
async fn process_inbox_item_creates_note_and_marks_processed() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("witt.db");
    let db = SqliteDb::connect(&db_path).await.unwrap();

    let item = InboxItem::new(
        "Hello world, hello again.".to_string(),
        witt_core::note::Source::App {
            name: "Test".to_string(),
            title: None,
        },
    );
    db.add_inbox_item(&item).await.unwrap();

    let notes = db
        .process_inbox_item(&item.id, vec!["world".to_string()])
        .await
        .unwrap();
    assert_eq!(notes.len(), 1);
    assert_eq!(notes[0].lemma, "world");
    assert_eq!(notes[0].contexts.len(), 1);
    assert_eq!(notes[0].contexts[0].sentence, "Hello world, hello again.");

    let saved = db.get_note_by_lemma("world").await.unwrap().unwrap();
    assert_eq!(saved.contexts.len(), 1);

    let reloaded = db.get_inbox_item(&item.id).await.unwrap().unwrap();
    assert!(reloaded.processed);
}

#[test]
fn extract_words_basic() {
    let words = witt_core::extraction::extract_words("Hello, hello. World! 123 foo bar baz");
    assert!(words.contains(&"hello".to_string()));
    assert!(words.contains(&"world".to_string()));
    assert!(words.contains(&"foo".to_string()));
}

#[tokio::test]
async fn list_inbox_items_with_date_filter() {
    let dir = tempdir().unwrap();
    let db_path = dir.path().join("witt.db");
    let db = SqliteDb::connect(&db_path).await.unwrap();

    let mut item1 = InboxItem::new(
        "First item".to_string(),
        witt_core::note::Source::App {
            name: "Test".to_string(),
            title: None,
        },
    );
    item1.captured_at = chrono::Utc.with_ymd_and_hms(2026, 1, 1, 12, 0, 0).unwrap();
    db.add_inbox_item(&item1).await.unwrap();

    let mut item2 = InboxItem::new(
        "Second item".to_string(),
        witt_core::note::Source::App {
            name: "Test".to_string(),
            title: None,
        },
    );
    item2.captured_at = chrono::Utc.with_ymd_and_hms(2026, 1, 3, 12, 0, 0).unwrap();
    db.add_inbox_item(&item2).await.unwrap();

    let after = "2026-01-02T00:00:00Z";
    let (items, total) = db
        .get_inbox_items_page(0, 10, None, None, None, Some(after), None)
        .await
        .unwrap();

    assert_eq!(total, 1);
    assert_eq!(items[0].id, item2.id);
}
