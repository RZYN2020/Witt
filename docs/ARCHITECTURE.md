# Architecture

## Overview

Witt is a Tauri desktop app. The Rust backend owns persistence, file handling, OS integration, and AnkiConnect access. The React frontend owns the reading experience, annotation UI, and LLM card generation.

```
witt/
├── witt-tauri/
│   ├── src-tauri/src/
│   │   ├── main.rs        # App entry, tray, command registration
│   │   ├── commands.rs    # Tauri IPC command re-export surface
│   │   ├── commands/      # Domain command handlers (books, annotations, Anki, LLM, profiles, settings)
│   │   ├── state.rs       # App data paths and shared SQLite connection
│   │   ├── app_config.rs  # Single settings.toml source of truth for editable configuration
│   │   ├── db.rs          # SQLite connection and CRUD helpers
│   │   ├── db_schema.rs   # SQLite schema and default settings migration
│   │   ├── db_settings.rs # Settings table read/write helpers
│   │   ├── models.rs      # Shared data types (Book, Annotation, …)
│   │   ├── anki.rs        # AnkiConnect HTTP client + sync orchestration
│   │   ├── anki_notes.rs  # Anki note construction, parsing, and templates
│   │   ├── books.rs       # EPUB file import and read helpers
│   │   ├── llm.rs         # LLM request/preprocess helpers
│   │   ├── settings.rs    # OS keyring access for LLM API key
│   │   └── tray.rs        # System tray menu
│   └── ui/src/
│       ├── App.tsx                          # App shell, routing
│       ├── components/bookshelf/            # Bookshelf view
│       ├── components/reader/               # epub.js reader, chrome, selection tools
│       ├── components/anki/                 # Anki panel (deck picker, cache, search)
│       ├── components/ui/Button.tsx
│       ├── lib/commands.ts                  # Typed wrappers for all Tauri commands
│       ├── lib/readerText.ts                # Sentence extraction, word highlighting
│       ├── lib/extensions.ts                # Extension registry interface
│       └── lib/utils.ts
```

## Database (SQLite)

The database file lives in the Tauri app data directory (`witt.sqlite3`). Schema is applied on first open by `db_schema.rs`; product CRUD helpers live in `db.rs`, while settings table access lives in `db_settings.rs`.

| Table              | Purpose                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| `books`            | Book metadata: title, author, file path, cover path, timestamps           |
| `reading_progress` | Last CFI position, chapter href, and percent per book                     |
| `annotations`      | Word + sentence + CFI, Anki sync status and note ID                       |
| `anki_decks`       | Available decks, which one is selected, last sync time                    |
| `anki_notes`       | Cached notes from the selected deck (word, sentence, meaning, raw fields) |
| `settings`         | SQLite cache of the active app config used by older DB-oriented flows     |

LLM API key is stored in the OS keyring via the `keyring` crate, not in SQLite.
Human-maintained configuration lives in one `settings.toml` file in the app data directory. It contains service endpoints, selected prompt/pipeline ids, Anki field mapping, behavior toggles, editor preference, prompt definitions, and Anki pipeline definitions. UI saves write back to this TOML file, and reload reads it back into the app. Word, book, progress, annotation, deck, and cached note data remain in SQLite.

## Tauri IPC Commands

All product operations go through `lib/commands.ts`. The frontend never touches the filesystem, SQLite, or AnkiConnect directly.

Backend command handlers live in `commands/` by product domain and are re-exported through `commands.rs` so `main.rs` has one command namespace. Keep handlers thin: put product persistence queries in `db.rs`, schema/default setting changes in `db_schema.rs`, settings table helpers in `db_settings.rs`, AnkiConnect calls in `anki.rs`, annotation-to-note conversion in `anki_notes.rs`, editable TOML config handling in `app_config.rs`, app path/state setup in `state.rs`, and EPUB file IO in `books.rs`.

**Books:** `import_book`, `list_books`, `get_book`, `remove_book`, `get_book_file`  
**Progress:** `save_progress`, `get_progress`  
**Annotations:** `create_annotation`, `list_annotations`, `sync_annotations_to_anki`  
**Anki:** `check_anki`, `list_anki_decks`, `select_anki_deck`, `refresh_anki_cache`, `search_anki_notes`, `get_anki_note`  
**Profiles:** `list_prompt_profiles`, `read_prompt_profile`, `save_prompt_profile`, `list_pipeline_profiles`, `load_pipeline_profile`  
**Settings:** `get_settings`, `save_settings`, `get_app_config`, `save_app_config`, `open_app_config`, `reload_app_config`, `save_llm_api_key`, `has_llm_api_key`

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
  -> optional: backend LLM preprocessing enriches meaning fields
  -> sync_annotations_to_anki creates notes via AnkiConnect

Pull known words
  -> refresh_anki_cache fetches deck notes into anki_notes table
  -> list_annotations returns word list
  -> readerText.applyHighlights() marks known words in reader
```

## Reader Frontend Boundaries

The reader is intentionally split so the EPUB lifecycle, chrome, selection UI, and side panels do not collapse into one component:

| Module                         | Responsibility                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `ReaderView.tsx`               | Coordinates book loading, epub.js rendition lifecycle, high-level panel state, and data flow between modules                   |
| `useEpubRendition.ts`          | epub.js book loading, rendition setup, iframe event wiring, progress persistence, pagination, and typography updates           |
| `ReaderChrome.tsx`             | Header, footer, page-turn edge zones, reader status, and page counters                                                         |
| `ReaderToc.tsx`                | Recursive table-of-contents display and chapter navigation                                                                     |
| `ReaderSettingsPanel.tsx`      | Settings panel shell; keeps reading controls first and advanced TOML/service configuration available behind secondary controls |
| `ReaderSettingsModal.tsx`      | Modal frame around reader settings                                                                                             |
| `ReaderAppearanceSettings.tsx` | Theme choice, page mode, font size, and line height controls                                                                   |
| `CustomThemeEditor.tsx`        | Custom theme color/CSS editing, import, export, and save controls                                                              |
| `ReaderServiceSettings.tsx`    | AnkiConnect endpoint test UI and LLM endpoint/model/key form                                                                   |
| `SelectionPopup.tsx`           | Contextual word card UI: selected word, source sentence, AI explanation state, and secondary save/prompt actions               |
| `useSelectionTools.ts`         | Selection action state and commands: create annotation, ask LLM, load/edit prompt definitions from the shared TOML config      |
| `readerEpub.ts`                | EPUB-specific helpers: CFI/page conversion, iframe selection ranges, reader typography, and injected document styles           |
| `readerConstants.ts`           | Shared reader layout constants and default display settings                                                                    |
| `readerTypes.ts`               | Reader display settings types shared by chrome, settings, and constants                                                        |

EPUB content is rendered inside epub.js iframes. Selection and right-click behavior must therefore be attached to the EPUB document through `rendition.hooks.content` or `rendition.on('selected')`; parent-window React handlers do not see normal iframe DOM events. Tauri capabilities are only required for IPC/plugin permissions, not for DOM selection or context-menu events.

## Anki Frontend Boundaries

The Anki side panel is split so cache/deck orchestration, sync configuration, and cached card rendering can evolve independently:

| Module                 | Responsibility                                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `AnkiPanel.tsx`        | Panel shell and layout; wires state/actions from `useAnkiPanel` into presentation components                                   |
| `useAnkiPanel.ts`      | AnkiConnect status, deck/model/pipeline loading, cache refresh, queued annotation sync, and shared TOML pipeline editing state |
| `AnkiSyncSettings.tsx` | Note type, field mapping, pipeline, and preprocess template/LLM configuration                                                  |
| `AnkiNoteList.tsx`     | Cached Anki note list and empty state                                                                                          |

## Frontend UI Conventions

Shared controls live in `components/ui/` and should be preferred over repeating Tailwind class strings in feature panels.

| Module              | Use                                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button.tsx`        | Command buttons and icon buttons                                                                                                           |
| `Tabs.tsx`          | Small segmented tab navigation                                                                                                             |
| `Form.tsx`          | Form fields, text inputs, selects, textareas, status text, and small choice grids                                                          |
| `ProfileEditor.tsx` | Text editing modal for prompt sections from `settings.toml`; pipeline editing opens the shared TOML file in the configured external editor |

Reader settings and Anki configuration panels should compose these primitives. New input rows should start with `Field`, `TextInput`, `SelectInput`, or `TextArea` instead of duplicating border, background, text, and spacing classes.

## Extension Surface

`lib/extensions.ts` provides the `WittExtension` and `AnnotationSink` interfaces. New non-core workflows should register here rather than adding to the reader or bookshelf code.
