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
pnpm check            # tsc + eslint + vitest (run before pushing)
pnpm test:run         # tests only
pnpm typecheck        # tsc --noEmit only

# Full desktop app (run from repo root)
cargo tauri dev

# Rust check (run from repo root)
cargo check

# Run a single test
cd witt-tauri/ui && pnpm vitest run src/path/to/file.test.tsx
```

## Architecture

Tauri desktop app. Rust owns persistence, file handling, OS keyring, and AnkiConnect HTTP. React owns the reading experience and all UI.

**Backend** (`witt-tauri/src-tauri/src/`):
- `commands.rs` — all 23 Tauri IPC commands and `AppState` (holds `Mutex<Connection>` + `books_dir`)
- `db.rs` — SQLite schema, migrations, and all SQL queries
- `models.rs` — shared types used by both commands and DB layer
- `anki.rs` — AnkiConnect HTTP client (check, fetch decks/notes, sync annotations)
- `books.rs` — EPUB file copy-on-import and byte reading
- `settings.rs` — OS keyring read/write for LLM API key
- `main.rs` — registers commands, sets up tray and window behavior

**Frontend** (`witt-tauri/ui/src/`):
- `lib/commands.ts` — **only place** that calls `invoke`; typed wrappers for all 23 commands
- `lib/llmCards.ts` — batch LLM card generation (chat-completions compatible endpoint)
- `lib/readerText.ts` — sentence extraction from selection, word normalization, DOM highlight application
- `lib/extensions.ts` — extension registry; non-core workflows plug in here
- `components/reader/ReaderView.tsx` — epub.js rendering, CFI progress save/restore, word selection → annotation, known-word highlighting
- `components/anki/AnkiPanel.tsx` — deck selector, refresh cache, annotation sync, cached card search
- `components/bookshelf/BookshelfView.tsx` — import, list, remove EPUB books

## Key Invariants

- **All Tauri IPC goes through `lib/commands.ts`** — components never call `invoke` directly.
- **All SQL lives in `db.rs`** — `commands.rs` calls db helpers, not raw SQL.
- **Annotations always carry `word + sentence + CFI`** — don't weaken this shape.
- **LLM API key** is in the OS keyring; endpoint/model are in the SQLite `settings` table.
- **Only the selected Anki deck is cached**; refresh is always manual.
- When adding an IPC command: add SQL helper in `db.rs` → type in `models.rs` → command in `commands.rs` → register in `main.rs` → typed wrapper in `lib/commands.ts`.
