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

Witt can run either as a Tauri desktop app or as a local/LAN web app. In web mode, the browser talks to `witt-server`; the server stores EPUBs and SQLite data, then talks to AnkiConnect on the server machine.

## Project Layout

```
witt/
├── crates/
│   └── witt-core/      # Portable Rust domain logic shared by desktop/web/server adapters
│   └── witt-storage/   # Shared SQLite and EPUB file storage adapter
│   └── witt-server/    # Axum web server for browser access
├── docs/               # Architecture, product, and development notes
├── witt-tauri/
│   ├── src-tauri/      # Rust/Tauri adapter (SQLite, files, keyring, windows, IPC)
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

# Web app served by Axum
cd witt-tauri/ui && pnpm build
cd /Users/eka/Code/witt
WITT_WEB_TOKEN=change-me cargo run -p witt-server
# open http://127.0.0.1:8787/?token=change-me
```

## Verification

```bash
cd witt-tauri/ui && pnpm check   # tsc + eslint + prettier check + vitest
cd witt-tauri/ui && pnpm build   # production bundle
cd /Users/eka/Code/witt && cargo test -p witt-core
cd /Users/eka/Code/witt && cargo test -p witt-storage
cd /Users/eka/Code/witt && cargo test -p witt-server
cd /Users/eka/Code/witt && cargo test -p witt-tauri
cd /Users/eka/Code/witt && cargo check --workspace
```

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for setup details, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the system design, [docs/PRODUCT.md](docs/PRODUCT.md) for scope decisions, and [docs/SENTIAREAD_ANALYSIS_AND_ROADMAP.md](docs/SENTIAREAD_ANALYSIS_AND_ROADMAP.md) for competitor analysis and product evolution notes.
