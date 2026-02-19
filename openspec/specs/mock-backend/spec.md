# Mock Backend Specification

## Purpose
This specification describes the mock backend implementation for Witt, used during UI development to simulate database persistence and external API calls without requiring real backend infrastructure.

## Requirements

### Requirement: In-memory card store
The system SHALL provide an in-memory data store for cards during UI development, simulating database persistence.

#### Scenario: Store is initialized with sample data
- **WHEN** the application starts
- **THEN** the mock store is initialized with 20-30 sample cards
- **THEN** sample cards cover multiple languages (English, German, Japanese, Korean, Chinese)
- **THEN** sample cards include varied sources (web, video, PDF)

#### Scenario: Create a new card
- **WHEN** the user saves a capture via the Tauri command
- **THEN** the card is added to the in-memory store
- **THEN** a unique UUID is assigned to the card
- **THEN** the `createdAt` timestamp is set to the current time
- **THEN** the command returns the new card's ID

#### Scenario: Read a card by ID
- **WHEN** the UI requests a card by UUID
- **WHEN** the card exists in the store
- **THEN** the card data is returned
- **THEN** the response includes a fake 50-100ms delay

- **WHEN** the card does not exist
- **THEN** an error is returned: "Card not found"

#### Scenario: Update an existing card
- **WHEN** the user edits and saves a card
- **WHEN** the update command is called with modified fields
- **THEN** the card is updated in the in-memory store
- **THEN** the `updatedAt` timestamp is set to the current time
- **THEN** the updated card is returned

#### Scenario: Delete a card
- **WHEN** the user deletes a card
- **WHEN** the delete command is called with the card's UUID
- **THEN** the card is removed from the in-memory store
- **THEN** the command returns success
- **THEN** subsequent reads of that card return "Card not found"

#### Scenario: Data does not persist across restarts
- **WHEN** the user creates or modifies cards
- **WHEN** the user restarts the application
- **THEN** all changes are lost (store re-initializes with sample data)
- **THEN** a development-mode banner is visible: "Mock Mode - Data Not Persisted"

### Requirement: Fake async delays
The system SHALL simulate realistic async operation delays to surface loading states in the UI.

#### Scenario: Query operations have delay
- **WHEN** a query command is executed (get_card, get_library_cards, search)
- **THEN** the command delays for 50-150ms (randomized)
- **THEN** the UI shows a loading state during the delay

#### Scenario: Mutation operations have delay
- **WHEN** a mutation command is executed (create_card, update_card, delete_card)
- **THEN** the command delays for 100-200ms (randomized)
- **THEN** the UI shows a loading state during the delay

#### Scenario: Search has debounced delay
- **WHEN** the search command is called rapidly (multiple times within 200ms)
- **THEN** only the last search query is executed
- **THEN** the search result is returned after 150ms

#### Scenario: Bulk load has extended delay
- **WHEN** the get_library_cards command is called without filters
- **WHEN** the library contains more than 50 cards
- **THEN** the delay is 200-400ms (simulating larger dataset)

### Requirement: Mock dictionary service
The system SHALL provide fake dictionary definitions for words during UI development.

#### Scenario: Common English words return definitions
- **WHEN** the word is a common English word (e.g., "bank", "run", "set")
- **THEN** 2-4 realistic dictionary definitions are returned
- **THEN** each definition includes a source attribution (e.g., "Wiktionary", "Merriam-Webster")
- **THEN** definitions include part of speech and example usage

#### Scenario: German words return definitions
- **WHEN** the word is German (detected by character patterns or language field)
- **THEN** 2-3 German definitions are returned (from mock German dictionary data)
- **THEN** definitions are in German or bilingual

#### Scenario: Unknown words return fallback
- **WHEN** the word is not in the mock dictionary
- **THEN** a generic fallback is returned: "No dictionary definition available"
- **THEN** the user can still add custom definitions manually

#### Scenario: CJK words return appropriate data
- **WHEN** the word is Chinese, Japanese, or Korean
- **THEN** appropriate mock definitions are returned (simplified for Phase 1)
- **THEN** definitions include pronunciation (pinyin, romaji) where applicable

### Requirement: Mock lemma extraction
The system SHALL provide fake lemma extraction for UI development, supporting multiple languages.

#### Scenario: English verb lemmatization
- **WHEN** the word is an English verb in past tense (e.g., "ran", "walked")
- **THEN** the lemma is returned as the base form ("run", "walk")
- **THEN** the extraction has a 50ms fake delay

- **WHEN** the word is an English verb in -ing form (e.g., "running")
- **THEN** the lemma is returned as the base form ("run")

#### Scenario: German noun lemmatization
- **WHEN** the word is a German noun with plural form (e.g., "Häuser")
- **THEN** the lemma is returned as singular ("Haus")

#### Scenario: CJK languages return word as-is
- **WHEN** the language is Chinese, Japanese, or Korean
- **THEN** the lemma is the same as the word (no lemmatization)
- **THEN** a note indicates: "Lemma extraction not available for this language"

#### Scenario: Manual lemma override
- **WHEN** the user manually edits the lemma field
- **THEN** the mock service accepts any user-provided lemma
- **THEN** the custom lemma is used instead of auto-extracted value

### Requirement: Mock tag autocomplete
The system SHALL provide tag suggestions based on previously used tags.

#### Scenario: Tag suggestions appear
- **WHEN** the user types in the tag input field
- **THEN** matching tags from the mock database are suggested
- **THEN** suggestions are sorted by usage frequency (most used first)
- **THEN** up to 5 suggestions are shown

#### Scenario: No matching tags
- **WHEN** the user types a string that matches no existing tags
- **THEN** the message "Create new tag: '[input]'" is shown
- **THEN** the user can press Enter to create the tag

#### Scenario: Recently used tags are prioritized
- **WHEN** multiple tags match the input
- **THEN** tags used in the last 7 days appear first
- **THEN** older tags appear below

### Requirement: Mock source metadata
The system SHALL generate realistic source metadata for sample cards.

#### Scenario: Web browser source
- **WHEN** a sample card has a web source
- **THEN** the source includes: page title, URL, favicon URL
- **THEN** example: { type: "web", title: "Wikipedia - Bank", url: "https://...", icon: "..." }

#### Scenario: Video source
- **WHEN** a sample card has a video source
- **THEN** the source includes: video filename, timestamp, optional frame number
- **THEN** example: { type: "video", filename: "movie.mp4", timestamp: "00:23:45" }

#### Scenario: PDF source
- **WHEN** a sample card has a PDF source
- **THEN** the source includes: PDF filename, page number
- **THEN** example: { type: "pdf", filename: "document.pdf", page: 42 }

#### Scenario: Application source
- **WHEN** a sample card is captured from an arbitrary application
- **THEN** the source includes: application name, window title (if available)
- **THEN** example: { type: "app", name: "Preview", title: "Document.pdf" }

### Requirement: Mock Anki export preview
The system SHALL simulate Anki export functionality for UI development.

#### Scenario: Export dialog opens
- **WHEN** the user clicks "Export to Anki" on a card or selection
- **THEN** an export dialog appears with options
- **THEN** options include: deck name, card template, include audio (checkbox)

#### Scenario: Fake export process
- **WHEN** the user clicks "Export" in the dialog
- **THEN** a progress indicator shows "Generating cards..."
- **THEN** after 1-2 seconds, a success message appears
- **THEN** a mock .apkg file download is triggered (or a placeholder file)

#### Scenario: Export preview
- **WHEN** the user clicks "Preview" in the export dialog
- **THEN** a preview shows how the card will appear in Anki
- **THEN** the preview includes: front (word), back (definitions + contexts)

### Requirement: Error simulation for edge cases
The system SHALL simulate realistic error conditions to test UI error handling.

#### Scenario: Network error simulation
- **WHEN** the mock store is configured to simulate errors (dev flag)
- **WHEN** a dictionary fetch is attempted
- **THEN** 10% of requests return a "Network error" response
- **THEN** the UI displays an appropriate error message

#### Scenario: Rate limit simulation
- **WHEN** more than 10 requests are made within 1 second
- **THEN** subsequent requests return a "Rate limited" error
- **THEN** the UI shows: "Too many requests. Please wait."

#### Scenario: Corrupt data simulation
- **WHEN** the mock store is configured with corrupt sample data
- **WHEN** the UI requests the library cards
- **THEN** some cards have missing fields (e.g., no lemma, empty context)
- **THEN** the UI gracefully handles and displays partial data

### Requirement: Development mode indicator
The system SHALL clearly indicate when running in mock mode to avoid confusion.

#### Scenario: Banner is visible in mock mode
- **WHEN** the application is running with mock backend
- **THEN** a subtle banner appears at the top or bottom of the window
- **THEN** the banner reads: "🧪 Mock Mode - Data Not Persisted"
- **THEN** the banner is styled differently from the main UI (e.g., yellow background)

#### Scenario: Banner can be dismissed
- **WHEN** the user clicks the "×" on the banner
- **THEN** the banner is hidden for the current session
- **THEN** the banner reappears on next launch

#### Scenario: Mock mode is logged to console
- **WHEN** the application starts in mock mode
- **THEN** a console.log message indicates: "Running in mock mode. Data will not persist."
- **THEN** instructions are logged: "Set MOCK_MODE=false to use real backend"
