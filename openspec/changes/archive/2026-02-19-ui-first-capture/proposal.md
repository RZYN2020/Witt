## Why

Witt's core value proposition — "meaning as use" through multi-context word capture — lives or dies by the quality of the capture experience. Users must **fall in love with capturing** before they experience the backend benefits. This change prioritizes **visible, delightful UI** over backend completeness, enabling rapid iteration on the user experience while the real data layer is developed in parallel.

## What Changes

- **New Tauri + React frontend** scaffolded with Vite, Tailwind CSS, and shadcn/ui components
- **Mock data layer** with 20-30 sample cards for UI development without backend dependencies
- **Capture popup** — A beautiful, keyboard-first popup that appears on global hotkey, showing:
  - Editable context text
  - Word + lemma fields with language selection
  - Auto-fetched definitions (mock)
  - Tag input with autocomplete
  - Source metadata display
  - Save/Save&Next/Discard actions
- **Library view** — Main window to browse captured cards with:
  - Grid/list toggle
  - Filters: Today, This Week, By Source
  - Search functionality
  - Card detail/edit view
- **Video player mock** — HTML5 video player with:
  - Subtitle overlay (.srt/.ass parsing mock)
  - Frame-accurate capture button
  - Timeline with subtitle markers
- **Zustand state management** — Fine-grained reactivity for smooth UI interactions
- **Framer Motion animations** — Delightful entrance/exit transitions, micro-interactions

## Capabilities

### New Capabilities
- `capture-popup`: Global hotkey-triggered popup for reviewing and editing captured text contexts before saving
- `library-view`: Main window interface for browsing, filtering, searching, and editing captured word cards
- `video-player`: Video playback with subtitle overlay and frame-accurate context capture
- `mock-backend`: In-memory data store with fake async delays for UI development independent of real backend

### Modified Capabilities
- *(none — this is greenfield development)*

## Impact

- **New directory structure**: `witt-tauri/` containing Tauri shell (`src-tauri/`) and React frontend (`ui/`)
- **New dependencies**: React, Zustand, Tailwind CSS, shadcn/ui, Framer Motion, Vite (frontend); Tauri, tokio (backend)
- **Tauri commands**: IPC layer for UI ↔ Rust communication (initially mock, later wired to `witt-core`)
- **Global hotkey**: System-level shortcut registration (Ctrl+Alt+C or user-configured)
- **No breaking changes**: This is initial frontend scaffolding for a greenfield project
