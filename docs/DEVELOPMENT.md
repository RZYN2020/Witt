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

Full desktop app (Tauri + Rust backend):

```bash
cargo tauri dev
```

## Quality Checks

Run both before pushing:

```bash
cd witt-tauri/ui
pnpm check          # tsc --noEmit, eslint, vitest run

cd /Users/eka/Code/witt
cargo check
```

## Backend Structure

The Rust side is in `witt-tauri/src-tauri/src/`. Key entry points:

- `main.rs` — registers all Tauri commands, builds the app
- `commands.rs` — command implementations and `AppState` (SQLite connection + books dir path)
- `db.rs` — all SQL; add new queries here, expose them through `commands.rs`

## Adding a Feature

1. If it touches the DB: add a table or column in `db.rs`, update `models.rs`, add a command in `commands.rs`, register it in `main.rs`.
2. Add a typed wrapper in `ui/src/lib/commands.ts`.
3. Build the UI component.

If the feature is non-core (not reading, annotation, Anki sync, or LLM), start from `ui/src/lib/extensions.ts`.

## Anki

Install AnkiConnect in Anki (add-on code `2055492159`). Enable it and leave Anki running. Witt talks to `http://localhost:8765`. The `Witt EPUB Sentence` note type is created on first sync.

## LLM

Set endpoint, model, and API key in the Settings panel inside the app. The key is saved to the OS keyring; endpoint and model go to the SQLite `settings` table. Batch size is capped at 20 annotations per request.
