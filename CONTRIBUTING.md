# Contributing to Witt

Thanks for your interest in contributing to Witt! This document provides guidelines for the project.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/eka/witt.git
cd witt

# Install Node.js dependencies
cd witt-tauri/ui
pnpm install

# Install Rust dependencies (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Run in development mode
pnpm dev
```

## Architecture Overview

### Frontend Stack
- **React 18** + TypeScript
- **Zustand** for state management (slice pattern)
- **Tailwind CSS** + shadcn/ui for styling
- **Framer Motion** for animations
- **Vite** for build tooling

### Backend
- **Tauri 2.x** for native window management
- **SQLite** + sqlx for data persistence
- **Real dictionary APIs** (Free Dictionary API)
- **rust-stemmers** for lemma extraction

## Project Structure

```
witt/
├── openspec/                    # OpenSpec change management
│   └── changes/
│       └── ui-first-capture/   # Current change
│
├── witt-tauri/
│   ├── src-tauri/              # Rust backend
│   │   ├── src/
│   │   │   ├── main.rs         # Entry point
│   │   │   ├── commands.rs     # IPC handlers
│   │   │   └── models.rs       # Data models
│   │   └── tauri.conf.json
│   │
│   └── ui/                     # React frontend
│       ├── src/
│       │   ├── components/     # UI components
│       │   │   ├── capture/    # Capture popup
│       │   │   ├── library/    # Library view
│       │   │   └── video/      # Video player
│       │   ├── stores/         # Zustand stores
│       │   ├── lib/            # Utilities
│       │   └── types/          # TypeScript types
│       └── package.json
│
└── README.md
```

## Coding Standards

### TypeScript
- Use strict mode
- Prefer `interface` for object types
- Use `type` for unions and primitives
- Always define return types for functions

### React
- Use functional components with hooks
- Keep components small and focused
- Use `cn()` utility for conditional classes
- Prefer composition over prop drilling

### State Management (Zustand)
- Use slice pattern for modular stores
- Keep actions small and composable
- Use selectors for derived state
- Persist user preferences to localStorage

### Styling
- Use Tailwind utility classes
- Follow mobile-first responsive design
- Support dark mode via `dark:` classes
- Maintain consistent spacing (Tailwind scale)

## Testing

```bash
# Run tests (when implemented)
pnpm test

# Run type checking
pnpm run type-check

# Run linting
pnpm run lint

# Format code
pnpm run format
```

### Test Categories

1. **Unit Tests** - Test individual functions and utilities
2. **Component Tests** - Test React components in isolation
3. **Integration Tests** - Test component interactions
4. **E2E Tests** - Test full user workflows

## Commit Messages

Follow conventional commits:

```
feat: add video subtitle parser
fix: correct lemma extraction for German verbs
docs: update README with setup instructions
style: improve button hover states
refactor: extract timeline component from video player
test: add smoke tests for capture popup
```

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Run tests and linting
4. Update documentation if needed
5. Submit PR with clear description
6. Request review

## Known Limitations

### Current (Mock Mode)
- Data doesn't persist across restarts
- Global hotkeys use web API (not native)
- No real dictionary integration
- Video import not fully implemented

### Future (Post-Mock)
- SQLite persistence
- Real dictionary APIs
- Native global hotkeys
- Anki export
- Cloud sync

## Questions?

Open an issue on GitHub or reach out to the maintainers.

---

**License:** MIT
