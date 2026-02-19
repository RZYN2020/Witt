# Implementation Tasks

## 1. Project Scaffolding

- [x] 1.1 Initialize Cargo workspace with `witt-tauri` crate
- [x] 1.2 Create Tauri 2.x project with `pnpm create tauri-app` (React + TypeScript template)
- [x] 1.3 Configure Vite build settings for Tauri integration
- [x] 1.4 Set up Tailwind CSS with custom theme configuration
- [x] 1.5 Install and configure shadcn/ui component library
- [x] 1.6 Install Framer Motion for animations
- [x] 1.7 Install Zustand for state management
- [x] 1.8 Install Lucide React for icons
- [x] 1.9 Configure ESLint + Prettier for React code
- [x] 1.10 Add development mode banner component (Mock Mode indicator)

## 2. Mock Backend Implementation

- [x] 2.1 Define TypeScript types for Card, Word, Context, Definition, Tag, Source
- [x] 2.2 Create mock data store with 20-30 sample cards (multi-language)
- [x] 2.3 Implement Tauri commands for CRUD operations (mock)
- [x] 2.4 Add fake async delays (50-200ms) to all mock commands
- [x] 2.5 Implement mock dictionary service (English, German, CJK fallback)
- [x] 2.6 Implement mock lemma extraction (simple English rules, fallback for others)
- [x] 2.7 Implement mock tag autocomplete with usage frequency
- [x] 2.8 Add error simulation flags for testing edge cases
- [x] 2.9 Create sample video metadata and subtitle mock data
- [x] 2.10 Add console logging for mock mode indicator

## 3. Zustand Store Implementation

- [x] 3.1 Create `useCaptureStore` with slice pattern (popup state, current capture)
- [x] 3.2 Create `useLibraryStore` with slice pattern (cards, filters, search)
- [x] 3.3 Create `useVideoStore` with slice pattern (current video, subtitles, playback state)
- [x] 3.4 Create `useSettingsStore` with slice pattern (preferences, hotkeys, theme)
- [x] 3.5 Implement Tauri event listeners for global shortcut triggers
- [x] 3.6 Add persistence layer for settings (localStorage)
- [x] 3.7 Create selector utilities for derived state

## 4. Capture Popup Component

- [x] 4.1 Create `CapturePopup` wrapper with Framer Motion animations
- [x] 4.2 Implement intelligent positioning (near cursor, center when clipped)
- [x] 4.3 Create `ContextEditor` component with auto-resize textarea
- [x] 4.4 Create `WordField` and `LemmaField` inputs with language selector
- [x] 4.5 Create `DefinitionList` component with loading states
- [x] 4.6 Create `TagInput` component with autocomplete dropdown
- [x] 4.7 Create `SourceMetadata` display with icons
- [x] 4.8 Create `NotesField` optional textarea
- [x] 4.9 Implement action buttons (Save & Close, Save & Next, Discard)
- [x] 4.10 Add keyboard navigation (Tab, Shift+Tab, Enter, Esc)
- [x] 4.11 Implement entrance/exit animations (scale + fade)
- [x] 4.12 Add validation (disable save when context/word empty)
- [x] 4.13 Implement undo toast after discard
- [x] 4.14 Wire up Tauri commands for save operations

## 5. Library View Components

- [x] 5.1 Create main window layout with sidebar and content area
- [x] 5.2 Create sidebar navigation with filter sections (Time, Sources)
- [x] 5.3 Create view toggle (Grid/List) with persistence
- [x] 5.4 Create `CardGrid` component with responsive columns
- [x] 5.5 Create `CardList` component with dense layout
- [x] 5.6 Create `CardPreview` component for grid items
- [x] 5.7 Create search bar with debounced filtering
- [x] 5.8 Create filter badge display with clear functionality
- [x] 5.9 Create `CardDetail` panel/modal for full card view
- [x] 5.10 Implement edit mode in detail view
- [x] 5.11 Implement delete with confirmation dialog
- [x] 5.12 Implement multi-select with Shift/Ctrl+click
- [x] 5.13 Create selection toolbar with batch actions
- [x] 5.14 Implement empty states (no cards, no search results)
- [x] 5.15 Add responsive behavior (sidebar collapse, mobile layout)
- [x] 5.16 Wire up Tauri commands for library data fetching

## 6. Video Player Components

- [x] 6.1 Create `VideoPlayer` wrapper with HTML5 video element
- [x] 6.2 Create custom playback controls (play/pause, volume, speed)
- [x] 6.3 Create timeline/scrubber with subtitle markers
- [x] 6.4 Implement frame-by-frame navigation (arrow keys)
- [x] 6.5 Create `SubtitleOverlay` component with positioning support
- [x] 6.6 Implement .srt subtitle parser
- [x] 6.7 Implement .vtt subtitle parser (stretch: .ass)
- [x] 6.8 Create subtitle settings panel (position, size, font)
- [x] 6.9 Create `CaptureButton` overlay for video capture
- [x] 6.10 Implement video import (drag-drop, file picker)
- [x] 6.11 Create video library section with thumbnails
- [x] 6.12 Implement "next subtitle" / "previous subtitle" navigation
- [x] 6.13 Add keyboard shortcuts (Space, J/K/L, Ctrl+C, Ctrl+N/P)
- [x] 6.14 Wire up capture popup integration from video player
- [x] 6.15 Add auto-load matching subtitle file feature

## 7. Global Hotkey Integration

- [x] 7.1 Configure global shortcut in `tauri.conf.json` (Ctrl+Alt+C)
- [x] 7.2 Implement Tauri event handler for shortcut trigger
- [x] 7.3 Create system tray menu with library open action
- [x] 7.4 Add shortcut customization in settings (UI + persistence)
- [x] 7.5 Implement disable/enable shortcut toggle
- [x] 7.6 Add second global shortcut for library (Ctrl+Alt+L)

## 8. Styling and Polish

- [x] 8.1 Define color theme (light/dark mode support)
- [x] 8.2 Create typography scale for headings, body, captions
- [x] 8.3 Add hover effects to all interactive elements
- [x] 8.4 Implement focus rings for keyboard navigation
- [x] 8.5 Create loading skeletons for async operations
- [x] 8.6 Add toast notification system
- [x] 8.7 Create consistent spacing system (Tailwind config)
- [x] 8.8 Add subtle shadows and depth to popup/modals
- [x] 8.9 Implement smooth transitions for all state changes
- [x] 8.10 Add emoji/icons to all action buttons

## 9. Testing and Quality

- [x] 9.1 Write smoke tests for capture popup rendering
- [x] 9.2 Write smoke tests for library view filtering
- [x] 9.3 Write smoke tests for video player subtitle parsing
- [x] 9.4 Test keyboard navigation flows end-to-end
- [x] 9.5 Test responsive layouts at breakpoints (768px, 1200px)
- [x] 9.6 Test with 500+ mock cards for performance
- [x] 9.7 Test error states (network errors, empty data)
- [x] 9.8 Document known limitations and edge cases

## 10. Documentation

- [x] 10.1 Write README.md with setup instructions
- [x] 10.2 Document keyboard shortcuts in help modal
- [x] 10.3 Add inline comments for complex components
- [x] 10.4 Create CONTRIBUTING.md for future development
- [x] 10.5 Document mock-to-real backend migration path
