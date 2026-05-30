# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Focus

- EPUB reader with bookshelf and reading progress
- Word annotation (word + sentence + CFI location)
- Sentence-backed Anki sync via AnkiConnect
- Pulling Anki deck words for reader highlighting
- LLM card generation in batches of up to 20 words
- Extension interfaces for future workflows

Primary documentation lives in `docs/`.

## Commands

```bash
# Frontend checks (run from witt-tauri/ui)
pnpm install          # first-time setup
pnpm dev              # dev server at http://localhost:1420
pnpm check            # tsc + eslint + prettier check + vitest (run before pushing)
pnpm test:run         # tests only
pnpm typecheck        # tsc --noEmit only
pnpm build            # production bundle

# Full desktop app (run from repo root)
cargo tauri dev

# Rust checks (run from witt-tauri/src-tauri)
cargo check
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test

# Run a single test
cd witt-tauri/ui && pnpm vitest run src/path/to/file.test.tsx
```

## Architecture

Tauri desktop app. Rust owns persistence, file handling, OS keyring, and AnkiConnect HTTP. React owns the reading experience and all UI.

**Backend** (`witt-tauri/src-tauri/src/`):
- `commands.rs` — re-exports domain command handlers for Tauri registration
- `commands/` — Tauri IPC command handlers grouped by domain (`books`, `annotations`, `anki`, `llm`, `profiles`, `settings`)
- `state.rs` — app data paths, editable settings TOML path, and shared SQLite connection
- `db.rs` — SQLite connection and product CRUD queries
- `db_schema.rs` — SQLite tables, indexes, migrations, and inserted default settings
- `db_settings.rs` — settings table read/write helpers re-exported through `db.rs`
- `models.rs` — shared types used by both commands and DB layer
- `app_config.rs` — single `settings.toml` source of truth for human-maintained config
- `anki.rs` — AnkiConnect HTTP client and sync orchestration
- `anki_notes.rs` — Anki note payload construction, template preprocessing, and notesInfo parsing
- `books.rs` — EPUB file copy-on-import and byte reading
- `llm.rs` — selection explanation and annotation preprocessing requests
- `settings.rs` — OS keyring read/write for LLM API key
- `main.rs` — registers commands, sets up tray and window behavior

**Frontend** (`witt-tauri/ui/src/`):
- `lib/commands.ts` — **only place** that calls Tauri; typed wrappers plus safe read-only browser fallbacks
- `lib/llmCards.ts` — batch LLM card generation (chat-completions compatible endpoint)
- `lib/readerText.ts` — sentence extraction from selection, word normalization, DOM highlight application
- `lib/extensions.ts` — extension registry; non-core workflows plug in here
- `components/reader/ReaderView.tsx` — reader shell and high-level state
- `components/reader/useEpubRendition.ts` — epub.js rendering, CFI progress save/restore, iframe events, pagination, known-word styling
- `components/reader/useSelectionTools.ts` — selection popup actions, auto Ask AI, and shared TOML prompt editing
- `components/anki/useAnkiPanel.ts` — deck selector, refresh cache, annotation sync, cached card search state
- `components/anki/AnkiPanel.tsx` — Anki side-panel layout shell
- `components/bookshelf/BookshelfView.tsx` — import, list, remove EPUB books

## Key Invariants

- **All Tauri IPC goes through `lib/commands.ts`** — components never call `invoke` directly.
- **Commands stay thin** — command handlers orchestrate domain helpers; raw SQL stays in DB modules.
- **DB responsibilities are split** — product queries in `db.rs`, schema/default settings in `db_schema.rs`, settings access in `db_settings.rs`.
- **Annotations always carry `word + sentence + CFI`** — don't weaken this shape.
- **LLM API key** is in the OS keyring; all other human-maintained config lives in one `settings.toml` source of truth, including endpoint/model, selected profiles, Anki field mapping, behavior toggles, editor preference, prompts, and pipelines. SQLite keeps product data and a settings cache only.
- **Only the selected Anki deck is cached**; refresh is always manual.
- **EPUB content is iframe-based** — selection and context-menu handlers belong in `useEpubRendition` / epub.js content hooks, not global parent-window handlers.
- When adding an IPC command: add DB helper if needed → type in `models.rs` → command in the matching `commands/` module → re-export in `commands.rs` → register in `main.rs` → typed wrapper in `lib/commands.ts`.
