# Witt

EPUB reader for language learning. Select a word while reading, build a sentence-backed annotation queue, generate card backs with an LLM, and sync everything to Anki.

## Core Workflow

1. Import an EPUB into the bookshelf.
2. Open a book — Witt restores your last reading position.
3. Select a word. Witt records the word and the surrounding sentence.
4. Enrich queued annotations with an LLM (up to 20 per batch).
5. Sync annotations to Anki through AnkiConnect.
6. Pull your Anki deck back into Witt — known words are highlighted while you read.

## Project Layout
parse_note
```
witt/
├── docs/               # Architecture, product, and development notes
├── witt-tauri/
│   ├── src-tauri/      # Rust/Tauri backend (SQLite, Anki, keyring)
│   └── ui/             # React + TypeScript frontend
└── Cargo.toml          # Rust workspace root
```

## Development

```bash
# Frontend only
cd witt-tauri/ui
pnpm install
pnpm dev           # http://localhost:1420

# Full desktop app
cargo tauri dev
```

## Verification

```bash
cd witt-tauri/ui && pnpm check   # tsc + eslint + vitest
cd /Users/eka/Code/witt && cargo check
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for setup details, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system design, and [docs/PRODUCT.md](docs/PRODUCT.md) for scope decisions.
