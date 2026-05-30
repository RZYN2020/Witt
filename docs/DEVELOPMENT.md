# Development

## Prerequisites

- Rust (stable) with `cargo`
- Node.js with `pnpm`
- Tauri CLI: `cargo install tauri-cli`

## Setup

```bash
cd witt-tauri/ui
pnpm install
```

## Running

Frontend only (no desktop features):

```bash
cd witt-tauri/ui
pnpm dev
# opens http://localhost:1420
```

The standalone browser build uses safe read-only fallbacks for Tauri commands, so the bookshelf and settings UI can render without the desktop runtime. File import, EPUB bytes, keychain writes, native windows, and other OS-backed commands still require `cargo tauri dev`.

Full desktop app (Tauri + Rust backend):

```bash
cargo tauri dev
```

## Quality Checks

Run these before pushing:

```bash
cd witt-tauri/ui
pnpm check          # tsc --noEmit, eslint, prettier check, vitest run
pnpm build          # production bundle and chunk sanity

cd /Users/eka/Code/witt/witt-tauri/src-tauri
cargo check
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

## Reader Development Notes

The EPUB reader is iframe-based because epub.js renders each spine document into its own document context. Keep iframe-specific code in `components/reader/readerEpub.ts` or the `rendition.hooks.content` block in `ReaderView.tsx`.

When changing selection behavior:

- Prefer epub.js `rendition.on('selected')` for completed selections.
- Use `rendition.hooks.content` for iframe document listeners such as `contextmenu`, `mouseup`, and keyboard forwarding.
- Do not add parent-window `onMouseUp` or `onContextMenu` handlers expecting them to observe EPUB body events.
- Do not add Tauri capabilities for selection bugs. Capabilities authorize IPC/plugin APIs; they do not control DOM text selection.

Framework support:

- Right-click menus use the standard DOM `contextmenu` event on the EPUB iframe document.
- Text selection uses the iframe document's `Selection`/`Range` APIs plus epub.js `rendition.on('selected')`.
- No Apple, Tauri, or web-platform registration is required for the selection popup itself.
- Ask AI needs an LLM endpoint and API key. Save-to-Anki needs AnkiConnect installed and Anki running.

Before judging reader UI changes, run:

```bash
cd witt-tauri/ui
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build
```

`ReaderView` is lazy-loaded from `App.tsx` so bookshelf windows do not ship epub.js in the initial bundle. Keep reader-only dependencies inside `components/reader/` and avoid importing them from `App.tsx`, bookshelf components, or shared UI primitives. Do not add a global `document.contextmenu` preventer; context-menu handling belongs inside the EPUB iframe listeners.

## Backend Structure

The Rust side is in `witt-tauri/src-tauri/src/`. Key entry points:

- `main.rs` — registers all Tauri commands, builds the app
- `commands.rs` — re-exports domain command handlers for Tauri registration
- `commands/` — command handlers grouped by product domain (`books`, `annotations`, `anki`, `llm`, `profiles`, `settings`)
- `state.rs` — app data directories and shared SQLite connection
- `app_config.rs` — reads/writes the single `settings.toml` source of truth for human-maintained config
- `db.rs` — SQLite connection and product CRUD queries
- `db_schema.rs` — tables, indexes, migrations, and inserted default settings
- `db_settings.rs` — settings table reads/writes exposed through `db.rs`
- `anki.rs` — AnkiConnect client and sync orchestration
- `anki_notes.rs` — note JSON construction, template preprocessing, notesInfo parsing, and note-related tests
- `llm.rs` — selection explanation and annotation preprocessing requests

## Adding a Feature

1. If it touches the DB: add tables/columns/defaults in `db_schema.rs`, product queries in `db.rs`, settings reads/writes in `db_settings.rs`, update `models.rs`, add a command in the matching `commands/` module, re-export it from `commands.rs`, register it in `main.rs`.
2. Add a typed wrapper in `ui/src/lib/commands.ts`.
3. Build the UI component. Reuse `components/ui/Button.tsx`, `Tabs.tsx`, and `Form.tsx` before adding new one-off form markup.

If the feature is non-core (not reading, annotation, Anki sync, or LLM), start from `ui/src/lib/extensions.ts`.

For Anki side-panel changes, keep command/state orchestration in `components/anki/useAnkiPanel.ts`. Keep `AnkiPanel.tsx` as the layout shell and add focused presentation components next to it when adding substantial new UI. Do not reintroduce an editable queued-captures list in the side panel; queued annotations are synced through the main sync action.

## Anki

Install AnkiConnect in Anki (add-on code `2055492159`). Enable it and leave Anki running. Witt talks to `http://localhost:8765`. The `Witt EPUB Sentence` note type is created on first sync.

## LLM

Set endpoint, model, and API key in the Settings panel inside the app. The key is saved to the OS keyring. Endpoint/model, selected prompt/pipeline ids, Anki field mapping, behavior toggles, editor preference, prompt definitions, and Anki pipeline definitions live in one `settings.toml` file in the app data directory. Panel saves write back to that file, and Reload TOML reads external edits back into the app. Batch size is capped at 20 annotations per request.

See `docs/TOML_CONFIGURATION.md` for the supported TOML shape and placeholders.
