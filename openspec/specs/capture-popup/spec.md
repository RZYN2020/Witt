# Capture Popup Specification

## Purpose
This specification describes the capture popup feature of the Witt application, which provides a keyboard-first workflow for capturing and saving word learning contexts from any application.

## Requirements

### Requirement: Global hotkey triggers capture popup
The system SHALL display a capture popup when the user presses the configured global hotkey combination, regardless of which application is currently focused.

#### Scenario: User presses default hotkey from another application
- **WHEN** the user is in any application (browser, PDF reader, video player)
- **WHEN** the user has selected text on the screen
- **WHEN** the user presses Ctrl+Alt+C (default hotkey)
- **THEN** the capture popup appears near the cursor or centered on screen
- **THEN** the selected text is automatically populated in the context field

#### Scenario: User presses custom hotkey
- **WHEN** the user has configured a custom hotkey combination in settings
- **WHEN** the user presses the custom hotkey
- **THEN** the capture popup appears with the same behavior as default

#### Scenario: Hotkey is disabled in settings
- **WHEN** the user has disabled the global hotkey in settings
- **THEN** pressing Ctrl+Alt+C does not trigger the popup
- **THEN** the user can still open capture via system tray menu

### Requirement: Context text is editable
The system SHALL display the captured text in an editable field, allowing the user to modify or replace the context before saving.

#### Scenario: User views auto-captured context
- **WHEN** the capture popup opens with selected text
- **THEN** the context field displays the selected text
- **THEN** the text is immediately editable (field is focused)

#### Scenario: User edits captured context
- **WHEN** the user modifies the text in the context field
- **THEN** the changes are reflected in real-time
- **THEN** the changes are preserved when saving

#### Scenario: User replaces context entirely
- **WHEN** the user selects all text (Ctrl+A) and types new content
- **THEN** the new content replaces the original
- **THEN** the word/lemma extraction updates based on new content

#### Scenario: Context field supports multi-line text
- **WHEN** the captured context spans multiple lines
- **THEN** the field expands vertically to show all content (up to 6 lines)
- **THEN** a scrollbar appears for longer content

### Requirement: Word and lemma extraction
The system SHALL automatically extract the primary word from the context and suggest a lemma, with manual override capability.

#### Scenario: Single word is selected
- **WHEN** the user selects a single word (e.g., "running")
- **THEN** the Word field is populated with "running"
- **THEN** the Lemma field is populated with the lemmatized form ("run")
- **THEN** the Language field defaults to detected or configured language

#### Scenario: Full sentence is selected
- **WHEN** the user selects a full sentence or phrase
- **THEN** the system identifies the most likely target word (e.g., longest unknown word, or first word)
- **THEN** the Word and Lemma fields are populated accordingly
- **THEN** the user can manually change the word if incorrect

#### Scenario: User manually changes lemma
- **WHEN** the user clicks in the Lemma field
- **THEN** the user can type a custom lemma
- **THEN** the custom lemma is saved instead of auto-extracted value

#### Scenario: Language is changed
- **WHEN** the user selects a different language from the dropdown
- **THEN** the lemma extraction re-runs with language-specific rules
- **THEN** the lemma may change based on language rules

### Requirement: Definitions are auto-fetched and editable
The system SHALL automatically fetch dictionary definitions for the identified word and allow users to add custom definitions.

#### Scenario: Definitions load automatically
- **WHEN** the capture popup opens with a word identified
- **THEN** the system fetches definitions from the configured source (mock in Phase 1)
- **THEN** definitions appear within 200ms (fake delay for realism)
- **THEN** a loading spinner is shown during fetch

#### Scenario: Multiple definitions are returned
- **WHEN** the word has multiple dictionary entries
- **THEN** definitions are displayed as a numbered list
- **THEN** each definition shows the source (e.g., "Wiktionary")
- **THEN** the user can select which definitions to keep

#### Scenario: User adds custom definition
- **WHEN** the user clicks "+ Add" in the definitions section
- **THEN** a text input appears
- **THEN** the user can type a custom definition
- **THEN** the custom definition is added to the list

#### Scenario: User edits fetched definition
- **WHEN** the user clicks the edit icon on a fetched definition
- **THEN** the definition becomes editable
- **THEN** the edited version is saved as user-modified (not overwritten on re-fetch)

### Requirement: Tag input with autocomplete
The system SHALL provide a tag input field with autocomplete suggestions based on previously used tags.

#### Scenario: User types in tag field
- **WHEN** the user starts typing in the tag input
- **THEN** a dropdown appears with matching tags from previous usage
- **THEN** the user can click a suggestion or continue typing

#### Scenario: User selects autocomplete suggestion
- **WHEN** the user clicks a suggested tag
- **WHEN** the user presses Enter with a suggestion highlighted
- **THEN** the tag is added as a pill below the input
- **THEN** the input field is cleared for the next tag

#### Scenario: User creates new tag
- **WHEN** the user types a tag that doesn't exist
- **WHEN** the user presses Enter or comma
- **THEN** the new tag is added as a pill
- **THEN** the tag is available for future autocomplete

#### Scenario: User removes a tag
- **WHEN** the user clicks the "×" on a tag pill
- **THEN** the tag is removed from the list
- **THEN** the change is reflected immediately

### Requirement: Source metadata display
The system SHALL display metadata about the source of the captured context (application, URL, timestamp, or video timestamp).

#### Scenario: Capture from web browser
- **WHEN** the user captures from a web browser
- **THEN** the source displays the page title and URL
- **THEN** a favicon is shown if available

#### Scenario: Capture from video player
- **WHEN** the user captures from the Witt video player
- **THEN** the source displays the video filename
- **THEN** the timestamp is shown (e.g., "00:23:45")
- **THEN** a "[Open in Player]" link is available

#### Scenario: Capture from arbitrary application
- **WHEN** the user captures from an application without URL/file context
- **THEN** the source displays the application name
- **THEN** the capture timestamp is shown

### Requirement: Save actions persist capture
The system SHALL provide multiple save options to support different workflow patterns.

#### Scenario: User saves and closes
- **WHEN** the user clicks "Save & Close" or presses Enter
- **THEN** the capture is saved to the library
- **THEN** the popup closes
- **THEN** a subtle success animation plays (checkmark, fade out)

#### Scenario: User saves and captures next
- **WHEN** the user clicks "Save & Next" or presses Ctrl+Enter
- **THEN** the capture is saved to the library
- **THEN** the popup remains open with cleared fields
- **THEN** the user can immediately capture another word (workflow continuity)

#### Scenario: User discards capture
- **WHEN** the user clicks "Discard" or presses Esc twice
- **THEN** the capture is not saved
- **THEN** the popup closes
- **THEN** a subtle undo toast appears for 3 seconds ("Undo?" link)

#### Scenario: Validation fails
- **WHEN** the user attempts to save with empty context
- **WHEN** the user attempts to save with empty word
- **THEN** the save action is disabled (button is grayed out)
- **THEN** a validation message appears ("Context is required")

### Requirement: Keyboard-first workflow
The system SHALL support complete operation via keyboard shortcuts for power users.

#### Scenario: Tab navigation
- **WHEN** the user presses Tab
- **THEN** focus moves to the next field (Context → Word → Lemma → Language → Definitions → Tags → Notes → Save button)
- **THEN** the focused element is clearly highlighted

#### Scenario: Shift+Tab reverse navigation
- **WHEN** the user presses Shift+Tab
- **THEN** focus moves to the previous field in reverse order

#### Scenario: Quick save
- **WHEN** the user presses Enter (and focus is not in a multi-line text field)
- **THEN** the capture is saved and popup closes

#### Scenario: Quick discard
- **WHEN** the user presses Esc
- **THEN** if in a text field, the field loses focus
- **WHEN** the user presses Esc again (no field focused)
- **THEN** the popup closes without saving (with undo option)

### Requirement: Popup positioning and animation
The system SHALL display the capture popup with smooth animations and intelligent positioning.

#### Scenario: Popup appears near cursor
- **WHEN** the user triggers capture with a mouse/trackpad
- **THEN** the popup appears near the cursor position (within 200px)
- **THEN** the popup is fully visible (not off-screen)

#### Scenario: Popup centers when near screen edges
- **WHEN** the cursor is near a screen edge
- **WHEN** positioning near cursor would clip the popup
- **THEN** the popup is centered on screen instead

#### Scenario: Entrance animation
- **WHEN** the popup opens
- **THEN** it scales from 0.95 to 1.0 over 150ms
- **THEN** opacity fades from 0 to 1 over 150ms
- **THEN** the animation uses ease-out timing

#### Scenario: Exit animation
- **WHEN** the popup closes
- **THEN** it scales from 1.0 to 0.95 over 100ms
- **THEN** opacity fades from 1 to 0 over 100ms
