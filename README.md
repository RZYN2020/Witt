# Witt

EPUB reader for language learning. Select a word while reading, build sentence-backed annotations, generate cached AI explanations, keep a local vocabulary index, and sync everything to Anki.

## Core Workflow

1. Import an EPUB into the learning workspace.
2. Open a book — Witt restores your last reading position.
3. Select a word. Witt records the word, surrounding sentence, and local vocabulary occurrence.
4. Ask AI manually, or enable auto Ask AI for new selections. Repeated default explanations are served from the local dictionary cache.
5. Sync annotations to Anki through AnkiConnect.
6. Pull your Anki deck back into Witt. Deck words are indexed locally, shown in Vocabulary, and highlighted while you read.

Human-maintained configuration lives in one `settings.toml` file in the app data directory: endpoints, selected profiles, Anki field mapping, behavior toggles, editor preference, prompts, and Anki pipelines. Open or reload it from Advanced configuration in Settings. API keys stay in the OS keyring rather than TOML. See [TOML Configuration](docs/TOML_CONFIGURATION.md).

## Project Layout

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
cd witt-tauri/ui && pnpm check   # tsc + eslint + prettier check + vitest
cd witt-tauri/ui && pnpm build   # production bundle
cd /Users/eka/Code/witt/witt-tauri/src-tauri && cargo fmt --check
cd /Users/eka/Code/witt/witt-tauri/src-tauri && cargo clippy --all-targets --all-features -- -D warnings
cd /Users/eka/Code/witt/witt-tauri/src-tauri && cargo test
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for setup details, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system design, [docs/PRODUCT.md](docs/PRODUCT.md) for scope decisions, and [docs/SENTIAREAD_ANALYSIS_AND_ROADMAP.md](docs/SENTIAREAD_ANALYSIS_AND_ROADMAP.md) for competitor analysis and product evolution notes.
