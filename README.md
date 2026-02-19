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
│   │   │   ├── models.rs       # Data models
│   │   │   └── mock_store.rs   # Mock data layer
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

**Phase:** UI-First Development (Mock Mode)

We're currently building the beautiful UI before wiring up the real backend. The app runs with:
- ✅ Mock data store (20-30 sample cards)
- ✅ Fake async delays (50-200ms)
- ✅ Mock dictionary service
- ✅ Mock lemma extraction
- 🚧 Capture popup (in progress)
- 🚧 Library view (in progress)
- 🚧 Video player (in progress)

## 🎹 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+C` | Open capture popup |
| `Ctrl+Alt+L` | Open library |
| `Tab` | Next field (in popup) |
| `Enter` | Save & Close |
| `Ctrl+Enter` | Save & Next |
| `Esc` | Close / Cancel |

## 🧪 Mock Mode

The app currently runs in **mock mode**:
- All data is stored in-memory
- Changes are lost on restart
- Sample data includes multi-language cards (EN, DE, JA, KO, ZH)
- An amber banner indicates mock mode

This allows rapid UI iteration before backend integration.

## 📖 Features (Planned)

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
- Mock store (Phase 1)
- SQLite + sqlx (Phase 2)

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

### Phase 1: UI-First (Current)
- [x] Project scaffolding
- [x] Mock backend
- [x] Zustand stores
- [ ] Capture popup
- [ ] Library view
- [ ] Video player

### Phase 2: Real Backend
- [ ] SQLite integration
- [ ] Real dictionary APIs
- [ ] Lemma extraction (ML-based)
- [ ] Data persistence

### Phase 3: Advanced Features
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
