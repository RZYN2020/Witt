```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
```

## Project Overview

**Witt** is a **Personal Language Asset Engine** that helps users build semantic understanding through multi-context word capture. It allows collecting rich contexts where words appear, creating a personal topology of meaning.

- **Vision**: Language learning through context topology rather than isolated vocabulary accumulation
- **Current Phase**: Real Backend Implementation (SQLite + Rust)
- **Repository**: `/Users/eka/Code/witt`

## Architecture

### High-Level Structure

```
witt/
├── openspec/                    # OpenSpec change management
├── witt-core/                   # Core Rust library (business logic)
├── witt-tauri/                  # Tauri + React frontend
│   ├── src-tauri/              # Rust backend (Tauri)
│   └── ui/                      # React frontend
└── README.md
```

### Frontend (React + TypeScript)

**Location**: `/Users/eka/Code/witt/witt-tauri/ui/`

- **Framework**: React 18 + TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS + shadcn/ui
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library

**Key Directories**:
- `src/components/` - UI components (organized by feature)
- `src/stores/` - Zustand state management stores
- `src/lib/` - Utility functions
- `src/types.ts` - TypeScript type definitions

### Backend (Rust + Tauri)

**Location**: `/Users/eka/Code/witt/witt-tauri/src-tauri/`

- **Framework**: Tauri 2.x
- **Async Runtime**: Tokio
- **Database**: SQLite + sqlx
- **HTTP Client**: reqwest
- **Lemma Extraction**: rust-stemmers

**Key Files**:
- `src/main.rs` - App entry point
- `src/commands.rs` - IPC handlers for frontend-backend communication
- `src/models.rs` - Data models
- `src/tray.rs` - System tray integration

### Core Library (Rust)

**Location**: `/Users/eka/Code/witt/witt-core/`

**Key Modules**:
- `lib.rs` - Library entry point
- `db/` - Database operations (SQLite)
- `note.rs` - Note management
- `media.rs` - Media handling
- `search.rs` - Search functionality
- `anki.rs` - Anki export
- `extraction.rs` - Text extraction/lemma extraction
- `inbox.rs` - Inbox management

## Development Workflow

### OpenSpec Change Management

The project uses **OpenSpec** for structured change management:

```bash
# List active changes
openspec list

# Check status of current change
openspec status --change ui-first-capture

# Continue implementation
/opsx:apply ui-first-capture
```

Current active change: `ui-first-capture` (see `/Users/eka/Code/witt/openspec/changes/ui-first-capture/`)

### Development Modes

#### 1. Web Development (No Rust required)

Fast UI development with hot reload:

```bash
cd witt-tauri/ui
pnpm install
pnpm dev
#访问 http://localhost:1420
```

**Data Storage**: Browser IndexedDB

#### 2. Desktop Development (Requires Rust)

Full Tauri desktop application:

```bash
# 前端（终端1）
cd witt-tauri/ui
pnpm install
pnpm dev

# 后端（终端2）
cd /Users/eka/Code/witt
cargo tauri dev
```

**Prerequisites**:
- Node.js v18+
- pnpm (`npm install -g pnpm`)
- Rust (via rustup)

### Build Commands

```bash
# Web production build
cd witt-tauri/ui
pnpm build

# Desktop application build
cd /Users/eka/Code/witt
cargo tauri build
```

### Testing

```bash
# Frontend tests (Vitest)
cd witt-tauri/ui
pnpm test:run          # Run all tests
pnpm test:ui           # Open Vitest UI
pnpm test:coverage     # Run tests with coverage

# Rust tests
cargo test
```

## Key Features

### Inbox
- Quick-capture raw context with global shortcut
- Browse/search/filter contexts
- Process items into lemmas
- Help dialog with best practices

### Capture Popup
- Global hotkey trigger
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

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+G` (macOS) / `Ctrl+G` (Windows/Linux) | Open capture popup |
| `Cmd+Alt+I` (macOS) / `Ctrl+Alt+I` (Windows/Linux) | Inbox quick capture |
| `Cmd+L` (macOS) / `Ctrl+L` (Windows/Linux) | Open library |
| `Tab` | Next field (in popup) |
| `Enter` | Save & Close |
| `Ctrl+Enter` | Save & Next |
| `Esc` | Close / Cancel |

**Note for macOS users**: Enable accessibility permissions in System Settings.

## Tech Stack Summary

**Frontend**:
- React 18, TypeScript, Zustand, Tailwind CSS, shadcn/ui, Framer Motion, Lucide React, Vite, Vitest

**Backend**:
- Rust, Tauri 2.x, Tokio, SQLite + sqlx, reqwest, rust-stemmers

**Build Tools**:
- Cargo (Rust), pnpm (Node.js), Vite, Tauri CLI

## Configuration Files

- `witt-tauri/ui/package.json` - Frontend dependencies
- `witt-tauri/src-tauri/Cargo.toml` - Backend dependencies
- `witt-tauri/src-tauri/tauri.conf.json` - Tauri configuration
- `Cargo.lock` - Rust dependency lock file