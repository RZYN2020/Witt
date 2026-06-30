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

Frontend dev server:

```bash
cd witt-tauri/ui
pnpm dev
# opens http://localhost:1420
```

When opened directly from Vite, the browser build calls `/api/*`. Run `witt-server` separately or set `VITE_WITT_API_BASE_URL` to a running server.

Full desktop app (Tauri + Rust backend):

```bash
cargo tauri dev
```

Web app (browser + Axum backend on the AnkiConnect machine):

```bash
cd witt-tauri/ui
pnpm build

cd /Users/eka/Code/witt
WITT_WEB_TOKEN=change-me \
WITT_DATA_DIR=.witt-data \
WITT_BIND=127.0.0.1:8787 \
cargo run -p witt-server

# Browser:
# http://127.0.0.1:8787/?token=change-me
```

For LAN access, set `WITT_BIND=0.0.0.0:8787` and keep the token private. The server machine must have Anki running with AnkiConnect enabled because sync requests are sent from the server to its configured Anki endpoint.

## Quality Checks

Run these before pushing:

```bash
cd witt-tauri/ui
pnpm check          # tsc --noEmit, eslint, prettier check, vitest run
pnpm build          # production bundle and chunk sanity

cd /Users/eka/Code/witt
cargo test -p witt-core
cargo test -p witt-storage
cargo test -p witt-server
cargo test -p witt-tauri
cargo check --workspace
cargo fmt --check --all
cargo clippy --workspace --all-targets --all-features -- -D warnings
```

## Reader Development Notes

The EPUB reader is iframe-based because epub.js renders each spine document into its own document context. Keep iframe-specific code in `components/reader/readerEpub.ts` or the `rendition.hooks.content` block in `ReaderView.tsx`.

Keyboard shortcuts are defined in `ReaderView.tsx` via a capture-phase `keydown` listener. They are suppressed when focus is in a form control. The TOC opens only via its header button or the `t` shortcut, not on blank-area clicks.

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

Shared Rust domain logic is in `crates/witt-core/src/`. Keep this crate portable: no SQLite, Tauri, app data paths, OS keyring, windows, or editor process launching. Callers pass API keys explicitly. Key modules are `models`, `defaults`, `anki_notes`, `anki_connect`, `sync`, `llm`, and `app_config`.

Shared persistence and EPUB file operations are in `crates/witt-storage/src/`. Both Tauri and the web server should reuse this crate for SQLite schema, CRUD, settings table access, and EPUB file storage.

The web adapter is `crates/witt-server`. It is an Axum server that authenticates `/api/*` with `Authorization: Bearer <WITT_WEB_TOKEN>`, serves the built React app, stores data under `WITT_DATA_DIR`, and talks to AnkiConnect from the server machine.

The desktop adapter is in `witt-tauri/src-tauri/src/`. Key entry points:

- `main.rs` — registers all Tauri commands, builds the app
- `commands.rs` — re-exports domain command handlers for Tauri registration
- `commands/` — command handlers grouped by product domain (`books`, `annotations`, `anki`, `llm`, `profiles`, `settings`)
- `state.rs` — app data directories and shared SQLite connection
- `app_config.rs` — reads/writes the single `settings.toml` source of truth for human-maintained config, delegating pure mapping/defaulting to `witt-core`
- `db.rs`, `books.rs` — thin re-export/adapters around shared `witt-storage` logic
- `anki.rs`, `anki_notes.rs`, `llm.rs`, `models.rs` — thin re-export/adapters around shared `witt-core` logic

## Adding a Feature

1. If it is reusable domain logic, add it to `crates/witt-core` first and keep persistence/secrets as explicit inputs or returned outputs.
2. If it touches DB/files: add schema/queries/storage helpers in `crates/witt-storage`.
3. Add the behavior to both adapters when applicable: Tauri command handlers and `witt-server` HTTP routes.
4. Add a typed wrapper in `ui/src/lib/commands.ts` for both Tauri IPC and browser HTTP transport.
5. Build the UI component. Reuse `components/ui/Button.tsx`, `Tabs.tsx`, and `Form.tsx` before adding new one-off form markup.

If the feature is non-core (not reading, annotation, Anki sync, or LLM), start from `ui/src/lib/extensions.ts`.

For Anki side-panel changes, keep command/state orchestration in `components/anki/useAnkiPanel.ts`. Keep `AnkiPanel.tsx` as the layout shell and add focused presentation components next to it when adding substantial new UI. Do not reintroduce an editable queued-captures list in the side panel; queued annotations are synced through the main sync action.

## Anki

Install AnkiConnect in Anki (add-on code `2055492159`). Enable it and leave Anki running. Witt talks to `http://localhost:8765`. The `Witt EPUB Sentence` note type is created on first sync.

## LLM

Set endpoint, model, and API key in the Settings panel inside the app. In Tauri mode the key is saved to the OS keyring. In web mode the key is set via `WITT_LLM_API_KEY` at server startup and can be updated at runtime through the Settings panel (stored in server memory). Endpoint/model, selected prompt/pipeline ids, Anki field mapping, behavior toggles, editor preference, prompt definitions, and Anki pipeline definitions live in one `settings.toml` file in the app data directory. Panel saves write back to that file, and Reload TOML reads external edits back into the app. Batch size is capped at 20 annotations per request.

See `docs/TOML_CONFIGURATION.md` for the supported TOML shape and placeholders.
