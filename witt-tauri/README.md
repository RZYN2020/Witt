# Witt - Tauri Frontend

Personal language asset engine built with Tauri + React.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Rust](https://rustup.rs/) (latest stable)

### Setup

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Project Structure

```
witt-tauri/
├── src-tauri/          # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs     # Tauri app entry point
│   │   ├── commands.rs # IPC command handlers
│   │   └── models.rs   # Data models
│   ├── Cargo.toml
│   └── tauri.conf.json
│
└── ui/                 # React frontend
    ├── src/
    │   ├── components/ # React components
    │   ├── stores/     # Zustand state management
    │   ├── lib/        # Utilities and IPC commands
    │   ├── types.ts    # TypeScript types
    │   └── App.tsx     # Main app component
    ├── package.json
    └── vite.config.ts
```

## Features (In Progress)

- 🎯 **Capture Popup** - Global hotkey trigger, editable context, auto-fetch definitions
- 📚 **Library View** - Browse, filter, search captured cards
- 🎬 **Video Player** - Watch with subtitles, frame-accurate capture
- 💾 **SQLite Backend** - Persistent storage with full CRUD operations

## Tech Stack

- **Frontend**: React 18, TypeScript, Zustand, Tailwind CSS, Framer Motion
- **Backend**: Rust, Tauri 2.x, Tokio
- **Styling**: shadcn/ui components, Tailwind CSS
- **State**: Zustand (slice pattern)
- **Animations**: Framer Motion

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Alt+C` | Open capture popup |
| `Ctrl+Alt+L` | Open library |
| `Tab` | Next field (in popup) |
| `Enter` | Save & Close |
| `Ctrl+Enter` | Save & Next |
| `Esc` | Close / Cancel |

## Backend Features

- 💾 **SQLite Database** - Persistent storage with sqlx
- 📖 **Dictionary API** - Free Dictionary API integration
- 🔤 **Lemma Extraction** - rust-stemmers for multiple languages
- 🌐 **HTTP Client** - reqwest for external API calls

## License

MIT
