# Library View Specification

## Purpose
This specification describes the library view feature of the Witt application, which provides a browsable, filterable interface for managing captured word cards.

## Requirements

### Requirement: Main window displays captured cards
The system SHALL provide a main library window showing all captured word cards in a browsable, filterable interface.

#### Scenario: User opens library window
- **WHEN** the user launches the Witt application
- **WHEN** the user presses Ctrl+Alt+L (global hotkey)
- **WHEN** the user clicks the library icon in the system tray
- **THEN** the main library window opens
- **THEN** cards are displayed in the default view (grid or list based on user preference)

#### Scenario: Cards display essential information
- **WHEN** cards are displayed in grid view
- **THEN** each card shows: word, lemma, preview of context (2 lines), tag count, source icon, capture date
- **THEN** cards have a subtle hover effect (lift + shadow)

- **WHEN** cards are displayed in list view
- **THEN** each row shows: word, lemma, full context (truncated), tags, source, date
- **THEN** rows have a hover highlight

#### Scenario: Empty state is shown
- **WHEN** there are no cards in the library (first launch)
- **THEN** a friendly empty state is displayed
- **THEN** the empty state includes: illustration, brief explanation, "Try capturing something" call-to-action
- **THEN** a keyboard shortcut hint is shown (e.g., "Press Ctrl+Alt+C to capture")

### Requirement: Grid and list view toggle
The system SHALL allow users to switch between grid and list viewing modes.

#### Scenario: User switches to grid view
- **WHEN** the user clicks the grid view icon in the toolbar
- **THEN** cards are displayed in a responsive grid layout (3-5 columns based on window width)
- **THEN** the grid view icon appears selected/active

#### Scenario: User switches to list view
- **WHEN** the user clicks the list view icon in the toolbar
- **THEN** cards are displayed in a single-column list
- **THEN** the list view icon appears selected/active

#### Scenario: View preference is persisted
- **WHEN** the user switches views
- **WHEN** the user closes the application
- **THEN** the view preference is saved
- **THEN** the next launch uses the saved preference

### Requirement: Filter by time and source
The system SHALL provide filtering options to narrow down displayed cards by time range and source.

#### Scenario: Filter by "Today"
- **WHEN** the user clicks "Today" in the filter sidebar
- **THEN** only cards captured today (since midnight) are displayed
- **THEN** the filter badge shows "Today" with a count

#### Scenario: Filter by "This Week"
- **WHEN** the user clicks "This Week" in the filter sidebar
- **THEN** only cards captured in the last 7 days are displayed
- **THEN** the filter badge shows "This Week" with a count

#### Scenario: Filter by "This Month"
- **WHEN** the user clicks "This Month" in the filter sidebar
- **THEN** only cards captured in the last 30 days are displayed
- **THEN** the filter badge shows "This Month" with a count

#### Scenario: Filter by specific source
- **WHEN** the user clicks on a source in the "Sources" section (e.g., "YouTube", "Chrome", "PDF")
- **THEN** only cards from that source are displayed
- **THEN** the filter badge shows the source name with a count

#### Scenario: Multiple filters combine
- **WHEN** the user selects "This Week" filter
- **WHEN** the user also selects a specific source filter
- **THEN** cards matching BOTH filters are displayed (intersection)
- **THEN** the filter badge shows both active filters

#### Scenario: Clear all filters
- **WHEN** the user clicks "Clear all" or the "×" on filter badges
- **THEN** all filters are removed
- **THEN** all cards are displayed
- **THEN** the sidebar shows "All" as selected

### Requirement: Search functionality
The system SHALL provide full-text search across all card fields.

#### Scenario: User searches by word
- **WHEN** the user types in the search bar
- **THEN** cards are filtered in real-time (as the user types)
- **THEN** matching cards show the search term highlighted in the word field

#### Scenario: Search matches context
- **WHEN** the user types text that appears in a card's context
- **THEN** that card appears in search results
- **THEN** the matching portion of context is highlighted

#### Scenario: Search matches tags
- **WHEN** the user types text that matches a tag
- **THEN** cards with that tag appear in search results
- **THEN** the matching tag is highlighted

#### Scenario: Search is debounced
- **WHEN** the user types rapidly
- **THEN** search only executes after 150ms of inactivity (prevents excessive filtering)
- **THEN** a subtle spinner appears during search on large libraries (1000+ cards)

#### Scenario: No search results
- **WHEN** the search query matches no cards
- **THEN** an empty state is shown: "No results for '[query]'"
- **THEN** suggestions are offered: "Try a different term" or "Clear filters"

### Requirement: Card detail view
The system SHALL provide a detailed view for inspecting and editing individual cards.

#### Scenario: User opens card detail
- **WHEN** the user clicks on a card in grid or list view
- **THEN** a detail panel slides in from the right (or modal opens)
- **THEN** the full card content is displayed: word, lemma, full context, all definitions, all tags, source, notes

#### Scenario: User edits card in detail view
- **WHEN** the user clicks the "Edit" button
- **THEN** all fields become editable (same as capture popup)
- **THEN** the user can save or cancel changes

#### Scenario: User deletes card from detail view
- **WHEN** the user clicks the "Delete" button
- **WHEN** the user confirms the deletion in a dialog
- **THEN** the card is permanently deleted
- **THEN** the detail view closes
- **THEN** a toast appears with "Undo" option (3 seconds)

#### Scenario: Detail view navigation
- **WHEN** the detail view is open
- **WHEN** the user presses Esc
- **THEN** the detail view closes (unsaved changes prompt if editing)

- **WHEN** the user presses arrow keys (←/→)
- **THEN** the previous/next card in the current view is opened

### Requirement: Multi-select and batch operations
The system SHALL allow users to select multiple cards and perform batch operations.

#### Scenario: User selects multiple cards
- **WHEN** the user holds Shift and clicks cards
- **WHEN** the user holds Ctrl/Cmd and clicks cards
- **THEN** selected cards are highlighted with a border
- **THEN** a selection toolbar appears showing count and available actions

#### Scenario: User deletes multiple cards
- **WHEN** the user has multiple cards selected
- **WHEN** the user clicks "Delete" in the selection toolbar
- **WHEN** the user confirms in the dialog
- **THEN** all selected cards are deleted
- **THEN** a toast appears with count and "Undo" option

#### Scenario: User exports multiple cards
- **WHEN** the user has multiple cards selected
- **WHEN** the user clicks "Export" in the selection toolbar
- **THEN** an export dialog opens with options (Anki, CSV, etc.)
- **THEN** the user can proceed with export or cancel

#### Scenario: Select all visible
- **WHEN** the user clicks "Select all" in the selection toolbar
- **THEN** all cards in the current filtered view are selected
- **THEN** the selection count updates

### Requirement: Responsive layout
The system SHALL adapt the library interface to different window sizes.

#### Scenario: Window is resized wide
- **WHEN** the window width is > 1200px
- **THEN** the sidebar is always visible
- **THEN** the grid shows 4-5 columns
- **THEN** the detail panel opens as an overlay (doesn't push content)

#### Scenario: Window is resized narrow
- **WHEN** the window width is < 768px
- **THEN** the sidebar collapses to icons only (or becomes a drawer)
- **THEN** the grid shows 1-2 columns
- **THEN** the detail panel opens as a full-screen modal

#### Scenario: Sidebar toggle
- **WHEN** the user clicks the sidebar toggle button
- **THEN** the sidebar collapses/expands
- **THEN** the preference is saved for next launch
