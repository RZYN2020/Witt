# Architecture

## Overview

Witt has a shared Rust core, a shared storage adapter, a Tauri desktop adapter, and an Axum web adapter. `witt-core` owns domain types, Anki note construction, AnkiConnect access, sync orchestration, LLM helpers, config mapping, and queue logic. `witt-storage` owns SQLite and EPUB file storage. Tauri owns desktop OS integration. `witt-server` exposes the same product workflow over HTTP for browser access.

```
witt/
├── crates/
│   └── witt-core/src/
│       ├── models.rs       # Shared DTOs and serialized IPC-compatible shapes
│       ├── defaults.rs     # Default endpoints, model names, prompts, and templates
│       ├── anki_notes.rs   # Anki note construction, export fields, notesInfo parsing
│       ├── anki_connect.rs # Portable AnkiConnect HTTP client
│       ├── sync.rs         # Storage-agnostic annotation-to-Anki sync orchestration
│       ├── llm.rs          # OpenAI-compatible chat and preprocess helpers
│       ├── app_config.rs   # Pure settings/config normalization and mapping
│       └── web_queue.rs    # Claim/report client and queue processing helper
│   └── witt-storage/src/   # Shared SQLite schema/CRUD/settings and EPUB file storage
│   └── witt-server/src/    # Axum HTTP API and static web app server
├── witt-tauri/
│   ├── src-tauri/src/
│   │   ├── main.rs        # App entry, tray, command registration
│   │   ├── commands.rs    # Tauri IPC command re-export surface
│   │   ├── commands/      # Domain command handlers (books, annotations, Anki, vocabulary, LLM, profiles, settings)
│   │   ├── state.rs       # App data paths and shared SQLite connection
│   │   ├── app_config.rs  # settings.toml file/editor adapter around witt-core config mapping
│   │   ├── db.rs          # Thin storage re-export
│   │   ├── models.rs      # Re-export of shared witt-core models
│   │   ├── anki.rs        # Thin desktop Anki adapter/re-exports
│   │   ├── anki_notes.rs  # Thin desktop note adapter/re-exports
│   │   ├── books.rs       # Thin storage re-export
│   │   ├── llm.rs         # Thin desktop LLM adapter/re-exports
│   │   ├── settings.rs    # OS keyring access for LLM API key
│   │   └── tray.rs        # System tray menu
│   └── ui/src/
│       ├── App.tsx                          # App shell, routing
│       ├── components/bookshelf/            # Bookshelf view
│       ├── components/reader/               # epub.js reader, chrome, selection tools
│       ├── components/anki/                 # Anki panel (deck picker, cache, search)
│       ├── components/ui/Button.tsx
│       ├── lib/commands.ts                  # Typed wrappers for Tauri IPC and browser HTTP
│       ├── lib/readerText.ts                # Sentence extraction, word highlighting
│       ├── lib/extensions.ts                # Extension registry interface
│       └── lib/utils.ts
```

## Database (SQLite)

The database file lives in the adapter data directory (`witt.sqlite3`). Tauri uses its app data directory; `witt-server` uses `WITT_DATA_DIR` or `.witt-data`. Schema, product CRUD, and settings table access live in `witt-storage`.

| Table                | Purpose                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `books`              | Book metadata: title, author, file path, cover path, timestamps           |
| `reading_progress`   | Last CFI position, chapter href, and percent per book                     |
| `annotations`        | Word + sentence + CFI, Anki sync status and note ID                       |
| `anki_decks`         | Available decks, which one is selected, last sync time                    |
| `anki_notes`         | Cached notes from the selected deck (word, sentence, meaning, raw fields) |
| `vocabulary`         | Normalized word index with status, Anki provenance, counts, and highlights |
| `meaning_groups`     | Meaning-level explanations derived from dictionary/AI cache               |
| `word_occurrences`   | Source contexts for words captured while reading                          |
| `dictionary_cache`   | Cached contextual AI explanations for repeated word lookups               |
| `settings`           | SQLite cache of the active app config used by older DB-oriented flows     |

LLM API key is stored in the OS keyring via the `keyring` crate, not in SQLite.
Human-maintained configuration lives in one `settings.toml` file in the app data directory. It contains service endpoints, selected prompt/pipeline ids, Anki field mapping, behavior toggles, editor preference, prompt definitions, and Anki pipeline definitions. UI saves write back to this TOML file, and reload reads it back into the app. Word, book, progress, annotation, deck, and cached note data remain in SQLite.

## Frontend Transport

All product operations go through `lib/commands.ts`. In Tauri, commands call IPC with `invoke`. In a normal browser, commands call authenticated `/api/*` endpoints on `witt-server`. The frontend never touches SQLite or AnkiConnect directly.

Tauri command handlers live in `commands/` by product domain and are re-exported through `commands.rs`. Web handlers live in `witt-server`. Keep both adapters thin: reusable domain logic belongs in `witt-core`; persistence and EPUB file logic belongs in `witt-storage`.

## Web Server API

`witt-server` serves the built React app and protects `/api/*` with `Authorization: Bearer <WITT_WEB_TOKEN>`. The browser can also receive the token from `?token=...`, which is stored in localStorage for subsequent API calls.

Important API groups:

- Books: `GET/POST /api/books`, `GET/DELETE /api/books/:id`, `GET /api/books/:id/file`.
- Reading progress: `GET/PUT /api/books/:id/progress`.
- Annotations: `GET/POST /api/annotations`, `PUT/DELETE /api/annotations/:id`.
- Vocabulary/cache: `/api/vocabulary`, `/api/word-occurrences/:word`, `/api/meaning-groups/:word`, `/api/dictionary-cache`.
- Anki: `/api/anki/status`, decks, models, cache refresh, notes, conflicts, sync, and AnkiWeb sync.
- Config/profiles: `/api/settings`, `/api/config`, `/api/prompts`, `/api/pipelines`.
- LLM: `POST /api/llm/selection`; the server reads `WITT_LLM_API_KEY`.

**Books:** `import_book`, `list_books`, `get_book`, `remove_book`, `get_book_file`  
**Progress:** `save_progress`, `get_progress`  
**Annotations:** `create_annotation`, `list_annotations`, `sync_annotations_to_anki`  
**Anki:** `check_anki`, `list_anki_decks`, `select_anki_deck`, `refresh_anki_cache`, `search_anki_notes`, `get_anki_note`, `list_anki_sync_conflicts`, `export_queued_annotations_tsv`
**Vocabulary:** `list_vocabulary`, `update_vocabulary_status`, `list_word_occurrences`, `list_meaning_groups`, `get_dictionary_cache`, `save_dictionary_cache`
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
  -> vocabulary and word_occurrences are updated
  -> optional AI explanation is read from/written to dictionary_cache

Sync to Anki
  -> adapter reads the LLM API key from OS keyring (Tauri) or WITT_LLM_API_KEY (server)
  -> witt-core LLM preprocessing enriches meaning fields when configured
  -> list_anki_sync_conflicts compares queued captures with local Anki cache
  -> witt-core sync creates notes via AnkiConnect and optionally pushes AnkiWeb
  -> Tauri persists synced annotation IDs and note IDs in SQLite
  -> export_queued_annotations_tsv writes a TSV fallback when AnkiConnect is unavailable

Pull known words
  -> refresh_anki_cache fetches deck notes into anki_notes table
  -> refresh_anki_cache indexes deck words into vocabulary
  -> list_annotations + list_vocabulary return reader highlight candidates
  -> readerText.applyHighlights() marks known words in reader
```

## Core/Adapter Boundary

`witt-core` is storage-agnostic. It does not read SQLite, app data directories, or OS keyrings, and callers pass secrets such as LLM API keys explicitly. It can be reused by the desktop app, a future hosted web server, or a pure web worker so long as the caller supplies settings, annotations, deck names, and persistence for returned sync results.

Tauri adapters are responsible for:

- SQLite reads/writes and schema migrations.
- OS keyring access through `settings.rs`.
- Reading, writing, and opening `settings.toml`.
- Filesystem access for EPUB imports, exports, app data, and windows/tray behavior.
- Persisting `(annotation_id, note_id)` pairs returned by `witt_core::sync::sync_annotations_to_anki`.

## Web Queue Contract

When web mode is enabled, the desktop app acts as an Anki worker for a remote queue. Tauri loads local settings and the optional LLM API key, then delegates claim, sync, AnkiWeb push, and report behavior to `witt_core::web_queue::process_queue`.

The queue endpoint in settings is treated as a base URL. Core calls:

- `POST {base}/anki/jobs/claim` with JSON `{ "limit": number }`, returning `WebQueueAnnotationJob[]`.
- `POST {base}/anki/jobs/report` with `WebQueueProcessSummary`.

If `web_queue_token` is set, both requests use bearer auth. Each claimed job may include job-specific `settings`, but the local worker always overrides the Anki endpoint and fills missing queue endpoint/token values from local settings. A job is classified complete only when at least one note was created, there are no failed entries, and optional AnkiWeb sync did not fail.

## Vocabulary Model

Anki can be the learner's long-term review backend, but the reader should not depend on live AnkiConnect lookups while a user is reading. Witt therefore keeps a local vocabulary layer:

- `annotations` remains the source of pending reading captures that can be synced to Anki.
- `anki_notes` remains the raw cache of selected deck notes for inspection and search.
- `vocabulary` is the fast normalized word index used by the reader and dashboard.
- `word_occurrences` stores source contexts for words captured in Witt.
- `dictionary_cache` stores reusable AI explanations so repeated selections do not call the LLM again.
- `meaning_groups` is updated from dictionary cache saves and feeds the Vocabulary context drawer.

This keeps the default mode hybrid without making Anki the only internal model. `vocabulary_backend_mode` supports `hybrid`, `anki_first`, and `witt_first`; the current implementation uses it as an explicit product setting while the local cache keeps reading fast. `visual_memory_scope` controls all-library versus current-book highlighting, and `inline_mini_gloss` can show cached meanings directly in the reader. Future review state, meaning grouping, export, and visual memory features should extend this vocabulary layer instead of duplicating word lists in reader components.

## Learning Workspace

The main window is a learning workspace rather than a raw file list. `BookshelfView` owns the first-screen dashboard and keeps it data-driven from existing command surfaces:

- Books: `list_books` plus per-book `get_progress` for Reading/Finished/Unread filters.
- Annotations: `list_annotations` for pending capture review.
- Vocabulary: `list_vocabulary` for status, source, occurrence count, cached meaning, and Anki provenance; `list_meaning_groups` and `list_word_occurrences` for the context drawer.
- Sync state: `list_anki_decks` for selected backend visibility.

This remains intentionally local to the home surface until the app needs a real router. New dashboard panels should reuse these command outputs instead of re-querying AnkiConnect directly.

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
