# Architecture

## Overview

Witt is a Tauri desktop app. The Rust backend owns persistence, file handling, OS integration, and AnkiConnect access. The React frontend owns the reading experience, annotation UI, and LLM card generation.

```
witt/
├── witt-tauri/
│   ├── src-tauri/src/
│   │   ├── main.rs        # App entry, tray, command registration
│   │   ├── commands.rs    # All 23 Tauri IPC commands + AppState
│   │   ├── db.rs          # SQLite schema, migrations, CRUD helpers
│   │   ├── models.rs      # Shared data types (Book, Annotation, …)
│   │   ├── anki.rs        # AnkiConnect HTTP client
│   │   ├── books.rs       # EPUB file import and read helpers
│   │   ├── settings.rs    # OS keyring access for LLM API key
│   │   └── tray.rs        # System tray menu
│   └── ui/src/
│       ├── App.tsx                          # App shell, routing
│       ├── components/bookshelf/            # Bookshelf view
│       ├── components/reader/               # epub.js reader + settings panel
│       ├── components/anki/                 # Anki panel (deck picker, cache, search)
│       ├── components/ui/Button.tsx
│       ├── lib/commands.ts                  # Typed wrappers for all Tauri commands
│       ├── lib/llmCards.ts                  # Batch LLM card generation
│       ├── lib/readerText.ts                # Sentence extraction, word highlighting
│       ├── lib/extensions.ts                # Extension registry interface
│       └── lib/utils.ts
```

## Database (SQLite)

The database file lives in the Tauri app data directory (`witt.sqlite3`). Schema is applied on first open; `db.rs` handles migrations.

| Table | Purpose |
|---|---|
| `books` | Book metadata: title, author, file path, cover path, timestamps |
| `reading_progress` | Last CFI position, chapter href, and percent per book |
| `annotations` | Word + sentence + CFI, Anki sync status and note ID |
| `anki_decks` | Available decks, which one is selected, last sync time |
| `anki_notes` | Cached notes from the selected deck (word, sentence, meaning, raw fields) |
| `settings` | Key-value store for LLM endpoint and model name |

LLM API key is stored in the OS keyring via the `keyring` crate, not in SQLite.

## Tauri IPC Commands

All product operations go through `lib/commands.ts`. The frontend never touches the filesystem, SQLite, or AnkiConnect directly.

**Books:** `import_book`, `list_books`, `get_book`, `remove_book`, `get_book_file`  
**Progress:** `save_progress`, `get_progress`  
**Annotations:** `create_annotation`, `list_annotations`, `sync_annotations_to_anki`  
**Anki:** `check_anki`, `list_anki_decks`, `select_anki_deck`, `refresh_anki_cache`, `search_anki_notes`, `get_anki_note`  
**Settings:** `get_settings`, `save_settings`, `save_llm_api_key`, `has_llm_api_key`

## Data Flow

```
Import EPUB
  -> backend copies file to app data/books/
  -> books table row created

Open book
  -> get_book_file returns raw bytes
  -> epub.js renders in ReaderView
  -> get_progress restores CFI position

Select word
  -> readerText.getSentenceAround() extracts context
  -> create_annotation writes to DB

Sync to Anki
  -> optional: llmCards.generateCardBacks() enriches meaning fields
  -> sync_annotations_to_anki creates notes via AnkiConnect

Pull known words
  -> refresh_anki_cache fetches deck notes into anki_notes table
  -> list_annotations returns word list
  -> readerText.applyHighlights() marks known words in reader
```

## Extension Surface

`lib/extensions.ts` provides the `WittExtension` and `AnnotationSink` interfaces. New non-core workflows should register here rather than adding to the reader or bookshelf code.
