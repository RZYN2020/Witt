# Witt

> **Personal Language Asset Engine**  
> *Meaning through use* — Inspired by Wittgenstein

Witt helps you build semantic understanding through multi-context word capture. Instead of learning isolated words, you collect rich contexts where words appear, creating a personal topology of meaning.

## 🎯 Vision

Language learning shouldn't be vocabulary accumulation—it should be **context topology**. Witt captures words in their natural habitats (articles, videos, conversations) and helps you see how meaning emerges through usage patterns.

## 🏗️ Architecture

```
witt/
├── openspec/                    # OpenSpec change management
│   ├── changes/
│   │   └── ui-first-capture/   # Current active change
│   └── specs/
│
├── witt-tauri/                  # Tauri + React frontend
│   ├── src-tauri/              # Rust backend (Tauri)
│   │   ├── src/
│   │   │   ├── main.rs         # App entry point
│   │   │   ├── commands.rs     # IPC handlers
│   │   │   └── models.rs       # Data models
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   │
│   └── ui/                      # React frontend
│       ├── src/
│       │   ├── components/      # UI components
│       │   ├── stores/          # Zustand state
│       │   ├── lib/             # Utilities
│       │   └── App.tsx
│       ├── package.json
│       └── vite.config.ts
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ ([install](https://nodejs.org/))
- **pnpm** (`npm install -g pnpm`)
- **Rust** ([install via rustup](https://rustup.rs/))

### Development

```bash
cd witt-tauri/ui

# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# The app will open at http://localhost:1420
```

### Build

```bash
cd witt-tauri/ui

# Build for production
pnpm build

# The built app will be in ui/dist
```

## 📋 Current Status

**Phase:** Real Backend Implementation

The app now runs with:
- ✅ SQLite database persistence
- ✅ Real dictionary API (Free Dictionary API)
- ✅ Real lemma extraction (rust-stemmers)
- ✅ Full CRUD operations
- ✅ Capture popup
- ✅ Library view
- ✅ Inbox (context backlog + batch processing)
- ✅ Video player

## 🎹 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+G` (macOS) / `Ctrl+G` (Windows/Linux) | Open capture popup |
| `Cmd+Alt+I` (macOS) / `Ctrl+Alt+I` (Windows/Linux) | Inbox quick capture |
| `Cmd+L` (macOS) / `Ctrl+L` (Windows/Linux) | Open library |
| `Tab` | Next field (in popup) |
| `Enter` | Save & Close |
| `Ctrl+Enter` | Save & Next |
| `Esc` | Close / Cancel |

> **Note for macOS users**: If shortcuts don't work, go to **System Settings → Privacy & Security → Accessibility** and enable Witt.

## 📖 Features

### Inbox
- Quick-capture raw context into Inbox (global shortcut)
- Browse/search/filter contexts (full-text when available)
- Process one item into multiple lemmas (creates/updates notes)
- Help dialog with best practices and the current “duplicate context” strategy

### Capture Popup
- Global hotkey trigger from any app
- Editable context text
- Auto-fetch definitions
- Tag input with autocomplete
- Save/Save&Next/Discard actions

### Library View
- Grid/List toggle
- Filter by time range and source
- Full-text search
- Multi-select and batch operations
- Card detail/edit view

### Video Player
- HTML5 video with custom controls
- Subtitle overlay (.srt, .vtt)
- Frame-accurate capture
- Timeline with subtitle markers
- Keyboard shortcuts for workflow

## 🚢 Deployment

### Tauri App

```bash
cargo tauri dev
cargo tauri build
```

### Notes
- Global shortcuts may require OS permissions (especially on macOS).
- Local data is stored in SQLite; verify read/write permissions in your target environment.

## 🛠️ Tech Stack

**Frontend:**
- React 18 + TypeScript
- Zustand (state management)
- Tailwind CSS + shadcn/ui
- Framer Motion (animations)
- Lucide React (icons)
- Vite (build tool)

**Backend:**
- Rust + Tauri 2.x
- Tokio (async runtime)
- SQLite + sqlx
- reqwest (HTTP client)
- rust-stemmers (lemma extraction)

## 📝 Development Workflow

We use **OpenSpec** for structured change management:

```bash
# List active changes
openspec list

# Check status of current change
openspec status --change ui-first-capture

# Continue implementation
/opsx:apply ui-first-capture
```

See `openspec/changes/ui-first-capture/` for:
- `proposal.md` — Why and what
- `design.md` — Technical decisions
- `specs/` — Detailed requirements
- `tasks.md` — Implementation checklist

## 🗺️ Roadmap

### Phase 1: UI-First (Completed)
- [x] Project scaffolding
- [x] Real backend integration
- [x] Zustand stores
- [x] Capture popup
- [x] Library view
- [x] Video player

### Phase 2: Advanced Features
- [x] SQLite integration
- [x] Real dictionary APIs
- [x] Lemma extraction (rust-stemmers)
- [x] Data persistence
- [ ] Anki export
- [ ] Semantic drift analysis (LLM)
- [ ] Cloud sync
- [ ] Mobile apps

## 🤝 Contributing

This is a personal project, but the architecture is designed for future collaboration. See `witt-tauri/README.md` for setup instructions.

## 📄 License

MIT

---

*"The meaning of a word is its use in the language."* — Ludwig Wittgenstein
