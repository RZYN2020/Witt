## Context

Witt is a greenfield personal language asset engine built on the Wittgensteinian principle that "meaning is use." The project aims to help users build semantic understanding through multi-context word capture. 

**Current state:** Empty repository with only OpenSpec scaffolding. No code exists.

**Constraints from requirements:**
- Performance: Resident memory < 50MB, response time < 100ms for capture
- Multi-language support: English, German, Japanese, Korean, Chinese (requires language-aware lemma extraction)
- UI-first development: Beautiful, polished interface before backend implementation
- Mock-first approach: Develop against fake data, swap to real backend incrementally
- Future cloud sync readiness (but not implemented in this phase)

**Stakeholders:** Solo developer building for personal use, with AI-assisted development.

## Goals / Non-Goals

**Goals:**
- Scaffold Tauri + React application with Vite and Tailwind CSS
- Implement beautiful capture popup with keyboard-first workflow
- Build library view with filtering and search
- Create video player mock with subtitle overlay
- Establish Zustand state management patterns
- Develop against mock data (20-30 sample cards)
- Achieve "delightful" UX with Framer Motion animations

**Non-Goals:**
- Real database persistence (deferred to later phase)
- LLM integration for semantic drift analysis
- Anki export functionality
- Cloud synchronization
- Production-ready video subtitle parsing
- Comprehensive test suite (basic smoke tests only for this phase)

## Decisions

### 1. Frontend Stack: React + Zustand + Tailwind CSS

**Decision:** Use React 19 with Zustand for state management and Tailwind CSS + shadcn/ui for styling.

**Rationale:**
- React has the largest ecosystem, best AI tooling support, and familiar mental model
- Zustand provides minimal-boilerplate state management that feels like signals (fine-grained reactivity)
- shadcn/ui offers beautiful, accessible components by default with copy-paste customization
- Tailwind enables rapid UI iteration without context-switching to CSS files

**Alternatives considered:**
- **SolidJS:** Better performance, smaller bundle, but smaller ecosystem and less AI support
- **Svelte:** Excellent DX, but hiring/community concerns if project grows
- **Redux Toolkit:** Too much boilerplate for this use case
- **Jotai/Recoil:** Overkill for local-first app; Zustand is simpler

### 2. Mock-First Architecture

**Decision:** Develop UI against in-memory mock store with fake async delays, swap to real backend via adapter pattern.

**Rationale:**
- Enables rapid UI iteration without backend dependencies
- Fake delays (50-200ms) reveal loading states early
- Forces clean IPC contract design (UI doesn't know it's talking to mocks)
- Can develop multiple sessions in parallel (UI + backend teams, or solo with focus switching)

**Implementation:**
```
ui/ (React)
  │
  ▼ IPC (Tauri commands)
witt-tauri/src/commands.rs
  │
  ├─▶ mock_store.rs (in-memory, fake async)  ← Phase 1
  │
  └─▶ witt_core::repository (SQLite)         ← Phase 2 (swap)
```

**Alternatives considered:**
- **Hardcoded JSON in frontend:** Faster for Session 1, but doesn't test IPC patterns
- **Feature flag for mock/real:** Adds complexity; better to swap entirely when ready
- **MSW-style mocking in browser:** Doesn't exercise Tauri command layer

### 3. Tauri V2 with Vite

**Decision:** Use Tauri 2.x (stable) with Vite as the frontend build tool.

**Rationale:**
- Tauri 2.x has stable plugin system and improved mobile support (future-proofing)
- Vite provides instant HMR, perfect for UI iteration
- Tauri's small bundle size aligns with < 50MB memory constraint
- Built-in system tray, global shortcut support

**Alternatives considered:**
- **Electron:** Too heavy (100MB+ baseline), violates memory constraint
- **Wry:** Lower-level, less mature ecosystem
- **Tauri 1.x:** Missing plugin improvements, mobile support

### 4. Component Architecture: Feature-Based Structure

**Decision:** Organize React components by feature, not by type.

**Structure:**
```
ui/src/components/
├── capture/
│   ├── CapturePopup.tsx
│   ├── ContextEditor.tsx
│   ├── DefinitionList.tsx
│   ├── TagInput.tsx
│   └── index.ts
├── library/
│   ├── LibraryView.tsx
│   ├── CardGrid.tsx
│   ├── CardList.tsx
│   ├── CardDetail.tsx
│   └── index.ts
├── video/
│   ├── VideoPlayer.tsx
│   ├── SubtitleOverlay.tsx
│   ├── Timeline.tsx
│   └── index.ts
└── ui/           # shadcn primitives
    ├── Button.tsx
    ├── Input.tsx
    └── ...
```

**Rationale:**
- Co-locates related components, hooks, and utilities
- Scales better as features grow
- Clear ownership boundaries

### 5. Zustand Store Design: Slice Pattern

**Decision:** Use Zustand's slice pattern for modular store design.

**Structure:**
```typescript
// stores/useCaptureStore.ts
interface CaptureSlice {
  currentCapture: Capture | null;
  isPopupOpen: boolean;
  openPopup: (capture: Capture) => void;
  closePopup: () => void;
  updateCapture: (updates: Partial<Capture>) => void;
}

// stores/useLibraryStore.ts
interface LibrarySlice {
  cards: Card[];
  filter: FilterType;
  searchQuery: string;
  setFilter: (filter: FilterType) => void;
  setSearchQuery: (query: string) => void;
  // ...
}
```

**Rationale:**
- Scales to multiple stores without monolithic state
- Each slice is independently testable
- Matches the domain model (capture, library, video are distinct concerns)

### 6. IPC Pattern: Command-Query Separation

**Decision:** Tauri commands follow CQS pattern — commands mutate, queries return data.

**Commands (mutate):**
```rust
#[tauri::command]
async fn save_capture(capture: Capture) -> Result<Uuid, String>
#[tauri::command]
async fn delete_card(id: Uuid) -> Result<(), String>
```

**Queries (read):**
```rust
#[tauri::command]
async fn get_card(id: Uuid) -> Result<Card, String>
#[tauri::command]
async fn get_library_cards(filter: Filter) -> Result<Vec<Card>, String>
```

**Rationale:**
- Clear intent (read vs. write)
- Easier to add caching, logging, validation on command boundaries
- Prepares for CQRS if backend grows

### 7. Animation Strategy: Framer Motion for All Motion

**Decision:** Use Framer Motion for all animations — entrance, exit, layout transitions, micro-interactions.

**Key animations:**
- Capture popup: Scale 0.95→1, fade in (200ms ease-out)
- Card hover: Subtle lift (y: -2px, shadow increase)
- Filter transitions: Layout animation with `layoutId`
- Button press: Scale 0.98, immediate feedback

**Rationale:**
- Declarative API, works naturally with React
- Layout animations are trivial (`layout` prop)
- Shared element transitions (`layoutId`) for card expand/collapse
- Better performance than CSS transitions (GPU-accelerated)

### 8. Video Player: HTML5 + Custom Controls

**Decision:** Use native HTML5 `<video>` element with custom React-controlled overlay for subtitles and capture UI.

**Structure:**
```tsx
<div className="relative">
  <video ref={videoRef} src={src} />
  <SubtitleOverlay currentTime={currentTime} subtitles={subtitles} />
  <CaptureButton onClick={handleCapture} />
  <Timeline currentTime={currentTime} markers={subtitleMarkers} />
</div>
```

**Rationale:**
- HTML5 video is well-supported and performant
- Full control over subtitle rendering (fonts, positioning, animations)
- Easier to integrate with React state than native video controls
- Can add frame-by-frame navigation later

**Alternatives considered:**
- **mpv bindings:** More powerful, but complex FFI and platform-specific issues
- **GStreamer:** Steep learning curve, overkill for this use case

### 9. Data Models: TypeScript ↔ Rust Type Sharing

**Decision:** Define shared types in a common schema file, generate TypeScript from Rust (or vice versa).

**Approach for Phase 1 (mock):**
```typescript
// ui/src/types.ts
export interface Card {
  id: string;
  word: string;
  lemma: string;
  context: string;
  definitions: Definition[];
  tags: string[];
  source: Source;
  createdAt: string;
}
```

```rust
// witt-tauri/src/models.rs (later, when wiring real backend)
#[derive(Serialize, Deserialize, Clone)]
pub struct Card {
    pub id: Uuid,
    pub word: String,
    pub lemma: String,
    pub context: String,
    pub definitions: Vec<Definition>,
    pub tags: Vec<String>,
    pub source: Source,
    pub created_at: DateTime<Utc>,
}
```

**Rationale:**
- Type safety across IPC boundary
- Catching mismatches at compile time (later phase)
- For now, TypeScript types are source of truth

### 10. Keyboard Shortcuts: Global + Local

**Decision:** Two-tier keyboard shortcut system.

**Global (Tauri-level):**
- `Ctrl+Alt+C` — Open capture popup (system-wide)
- `Ctrl+Alt+L` — Open library window

**Local (React-level, when app is focused):**
- `Tab` — Next field in capture popup
- `Enter` — Save & Close
- `Ctrl+Enter` — Save & Next
- `Esc` — Close popup / Cancel
- `Ctrl+F` — Focus search in library
- `Ctrl+1/2/3` — Switch filter (Today/This Week/All)

**Rationale:**
- Global shortcuts enable capture from any application
- Local shortcuts optimize workflow within the app
- Follows conventions from similar tools (Raycast, Alfred)

## Risks / Trade-offs

### [Risk] Mock-to-Real Swap Complexity

**Risk:** The mock store patterns may not translate cleanly to real async database operations, requiring significant refactoring.

**Mitigation:**
- Use identical function signatures for mock and real commands
- Always return `Result<T, String>` even in mocks
- Add fake delays (50-200ms) to mocks to surface loading states
- Plan for a dedicated "wire up backend" session

### [Risk] Performance with Large Libraries

**Risk:** React + Framer Motion may lag with 1000+ cards in library view.

**Mitigation:**
- Implement virtual scrolling (tanstack-virtual) from the start
- Paginate mock data (show 50 at a time)
- Profile at 500 cards before considering optimization

### [Risk] Tauri 2.x Immaturity

**Risk:** Tauri 2.x is relatively new; may encounter bugs or missing features.

**Mitigation:**
- Stick to stable, documented APIs
- Have fallback plan (Tauri 1.x) if critical issues arise
- Monitor Tauri Discord/ GitHub for known issues

### [Risk] Scope Creep on UI Polish

**Risk:** "Beautiful UI" is subjective; may spend too much time on aesthetics vs. functionality.

**Mitigation:**
- Use shadcn/ui as the design system (opinionated defaults)
- Time-box polish sessions (2 hours max per component)
- Define "done" as "feels delightful to use for 5 minutes"

### [Risk] Multi-Language Lemma Complexity Deferred

**Risk:** Lemma extraction for CJK languages is fundamentally hard; current design assumes it's pluggable but doesn't implement it.

**Mitigation:**
- Explicitly mark lemma field as "user editable" in UI
- Provide "Manual" lemma entry as default for Phase 1
- Document lemma engine as a future capability (separate change)

## Migration Plan

**Not applicable** — This is greenfield development with no existing users or data to migrate.

**Deployment:** Single binary distribution (Tauri bundle) for macOS, Windows, Linux. Future: App Store, Homebrew, winget.

## Open Questions

1. **Color theme:** Should Witt have a distinctive brand color, or stay neutral (gray/monochrome)?
2. **Default keyboard shortcuts:** Are `Ctrl+Alt+C` and `Ctrl+Alt+L` good defaults, or should we survey users?
3. **Video format support:** HTML5 video supports MP4/WebM by default. Should we bundle FFmpeg for broader format support, or document format limitations?
4. **Anki export format:** When implemented, should exported cards use a specific template, or user-configurable?
