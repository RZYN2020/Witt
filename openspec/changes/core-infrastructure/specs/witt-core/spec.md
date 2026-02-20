# WittCore 核心功能规格说明

## Purpose
WittCore 是 Witt 应用的核心逻辑层，负责 Note-Context 数据模型的管理、业务逻辑处理和外部系统集成。

## Requirements

### Requirement: Note (单词原型) 管理
The system SHALL provide centralized management of word lemmas (prototypes) with their associated metadata.

#### Scenario: Create a new note
- **WHEN** the user captures a new word that doesn't exist in the database
- **THEN** a new Note is created with the captured lemma
- **THEN** the system automatically fetches pronunciation and phonetics (using external APIs)
- **THEN** the definition is populated with the first available dictionary entry

#### Scenario: Get an existing note
- **WHEN** the user captures a word that already exists in the database
- **THEN** the existing Note is retrieved
- **THEN** all existing Contexts are displayed in the capture popup
- **THEN** the user can choose to add a new Context (if there are available slots)

#### Scenario: Update note metadata
- **WHEN** the user edits the definition of a Note
- **THEN** the Note's definition is updated in the database
- **THEN** the change is synced to Anki on next sync operation

#### Scenario: Delete a note
- **WHEN** the user deletes a Note from the library
- **THEN** the Note and all its associated Contexts are deleted from the database
- **THEN** the corresponding Anki notes are deleted from the user's collection

### Requirement: Context (语境) 槽位管理
The system SHALL manage up to 5 context slots per Note, ensuring no more than 5 contexts are associated with any single lemma.

#### Scenario: Add context to a note with available slots
- **WHEN** a Note has fewer than 5 Contexts
- **WHEN** the user captures a new Context for that Note
- **THEN** the new Context is added to the Note's contexts list
- **THEN** the new Context is stored in the database

#### Scenario: Add context to a note with full slots
- **WHEN** a Note already has 5 Contexts
- **WHEN** the user attempts to add a new Context
- **THEN** the system displays a warning: "Maximum contexts (5) reached for this word"
- **THEN** the user is presented with options to delete an existing Context

#### Scenario: Remove a context from a note
- **WHEN** the user deletes a Context from a Note
- **THEN** the Context is removed from the Note's contexts list
- **THEN** the corresponding Anki context card is deleted from the user's collection

#### Scenario: Reorder contexts in a note
- **WHEN** the user drags and drops Contexts to reorder them
- **THEN** the Contexts are reordered in the UI and database
- **THEN** the Anki context cards are updated to reflect the new order

### Requirement: Source metadata tracking
The system SHALL track detailed source information for each Context to facilitate future reference and review.

#### Scenario: Capture from web browser
- **WHEN** the user captures a word from a web browser
- **THEN** the Context's source includes: page title, URL, and favicon
- **THEN** the source type is stored as "web" in the database

#### Scenario: Capture from video player
- **WHEN** the user captures a word from the Witt video player
- **THEN** the Context's source includes: video filename and timestamp
- **THEN** the source type is stored as "video" in the database
- **THEN** a frame number may be included if available

#### Scenario: Capture from PDF reader
- **WHEN** the user captures a word from a PDF document
- **THEN** the Context's source includes: PDF filename and page number
- **THEN** the source type is stored as "pdf" in the database

#### Scenario: Capture from other application
- **WHEN** the user captures a word from an application without specific source metadata
- **THEN** the Context's source includes: application name and window title (if available)
- **THEN** the source type is stored as "app" in the database

### Requirement: Media attachment management
The system SHALL support the attachment of audio and image media to Contexts for enhanced learning.

#### Scenario: Attach an image to a context
- **WHEN** the user attaches an image to a Context (via drag-and-drop or file picker)
- **THEN** the image is saved to the media folder
- **THEN** the image file path is stored in the Context's media field
- **THEN** the image is displayed in the capture popup and library view

#### Scenario: Attach audio to a context
- **WHEN** the user attaches an audio file to a Context
- **THEN** the audio file is saved to the media folder
- **THEN** the audio file path is stored in the Context's media field
- **THEN** an audio playback control is available in the UI

#### Scenario: Media file organization
- **WHEN** media files are saved
- **THEN** they are stored in a structured directory: `<data_dir>/media/<uuid>.<ext>`
- **THEN** filenames are UUIDs to avoid conflicts
- **THEN** the media directory structure matches Anki's media folder format

### Requirement: Note search and filtering
The system SHALL provide robust search and filtering capabilities for Notes and their Contexts.

#### Scenario: Search by lemma
- **WHEN** the user searches for a word lemma
- **THEN** all Notes with matching lemmas are returned
- **THEN** search results include matching Contexts

#### Scenario: Search by word form in context
- **WHEN** the user searches for a specific word form (e.g., "implemented")
- **THEN** all Contexts containing that word form are returned
- **THEN** the search results highlight the matching word form

#### Scenario: Search by tag
- **WHEN** the user searches for a specific tag (e.g., "#Golang")
- **THEN** all Notes with that tag are returned
- **THEN** the results are sorted by relevance

#### Scenario: Filter by deck
- **WHEN** the user selects a specific deck from the filter menu
- **THEN** only Notes assigned to that deck are displayed
- **THEN** Contexts from those Notes are also displayed

### Requirement: Deck management
The system SHALL allow users to organize Notes into customizable decks for targeted learning.

#### Scenario: Create a new deck
- **WHEN** the user creates a new deck
- **THEN** the deck is added to the deck hierarchy
- **THEN** the deck structure is stored in the database

#### Scenario: Assign note to deck
- **WHEN** the user assigns a Note to a specific deck
- **THEN** the Note's deck field is updated in the database
- **THEN** the change is reflected in future Anki sync operations

#### Scenario: Deck hierarchy
- **WHEN** the user creates nested decks (e.g., "Language::English::Business")
- **THEN** the system supports hierarchical deck structures
- **THEN** the deck hierarchy is reflected in Anki's deck structure

### Requirement: Data validation
The system SHALL validate all incoming data to ensure consistency and integrity.

#### Scenario: Validate required fields
- **WHEN** the user attempts to save a Note without a lemma
- **THEN** the save operation fails
- **THEN** an error message is displayed: "Lemma is required"

#### Scenario: Validate context fields
- **WHEN** the user attempts to save a Context without a sentence
- **THEN** the save operation fails
- **THEN** an error message is displayed: "Context sentence is required"

#### Scenario: Validate media file types
- **WHEN** the user attempts to attach an unsupported media file type
- **THEN** the attachment operation fails
- **THEN** an error message is displayed: "Unsupported file type. Please use PNG, JPG, MP3, or WAV files."

### Requirement: Error recovery and logging
The system SHALL handle errors gracefully and maintain detailed logs for debugging purposes.

#### Scenario: Database connection error
- **WHEN** the system fails to connect to the database
- **THEN** an error message is displayed to the user
- **THEN** the error is logged to the system log file

#### Scenario: Media file not found
- **WHEN** the system attempts to access a media file that no longer exists
- **THEN** a placeholder image or audio indicator is displayed
- **THEN** a warning is logged to the system log file

#### Scenario: Operation timeout
- **WHEN** an operation takes longer than expected
- **THEN** a timeout error is displayed to the user
- **THEN** the operation is canceled and logged
