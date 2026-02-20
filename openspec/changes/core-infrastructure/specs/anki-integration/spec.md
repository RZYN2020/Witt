# Anki Integration Specification

## Purpose
This specification describes the integration between Witt and Anki via AnkiConnect, including card generation, synchronization, and management of Anki note types.

## Requirements

### Requirement: AnkiConnect HTTP API communication
The system SHALL communicate with Anki via the AnkiConnect HTTP API on port 8765.

#### Scenario: Test AnkiConnect connection
- **WHEN** the application starts
- **THEN** it attempts to connect to AnkiConnect at http://localhost:8765
- **THEN** it displays a status indicator showing connection status
- **THEN** if connection fails, it provides instructions for installing AnkiConnect

#### Scenario: Handle connection timeout
- **WHEN** AnkiConnect fails to respond within 5 seconds
- **THEN** the operation is canceled
- **THEN** an error message is displayed: "Anki not responding"
- **THEN** the user is advised to check if Anki is running and AnkiConnect is installed

#### Scenario: Reconnect to AnkiConnect
- **WHEN** the user clicks "Retry Connection" after a failed attempt
- **THEN** the system attempts to reconnect to AnkiConnect
- **THEN** the status indicator updates with the new connection status

### Requirement: Anki note type management
The system SHALL manage custom Anki note types optimized for Witt learning.

#### Scenario: Create Witt note types on first sync
- **WHEN** the user performs the first sync with Anki
- **THEN** the system checks if Witt note types exist in Anki
- **THEN** if not, it creates two new note types: "Witt - Basic" and "Witt - Context"

#### Scenario: Witt - Basic note type
- **WHEN** the "Witt - Basic" note type is created
- **THEN** it includes the following fields:
  - Lemma: word lemma
  - Phonetics: pronunciation guide (e.g., IPA)
  - Pronunciation: audio file path
  - Definition: core dictionary definition
  - Contexts: JSON list of all contexts for the lemma
  - Comment: user comments
- **THEN** it has one card template with front: Lemma + Phonetics + Pronunciation and back: Definition + Contexts + Comment

#### Scenario: Witt - Context note type
- **WHEN** the "Witt - Context" note type is created
- **THEN** it includes the following fields:
  - Lemma: word lemma
  - Phonetics: pronunciation guide
  - Pronunciation: lemma audio file path
  - WordForm: specific word form in this context
  - Sentence: the sentence with word form blanked out
  - ContextAudio: audio file path for this specific context
  - Image: image file path for this specific context
  - Source: source metadata (url, filename, etc.)
  - Comment: user comments
  - OtherContexts: JSON list of other contexts for the lemma
- **THEN** it has one card template with conditional logic based on context index

### Requirement: Card generation from Note and Context
The system SHALL generate appropriate Anki notes from Witt's Note and Context models.

#### Scenario: Generate basic card from Note
- **WHEN** a Note is ready to be synced
- **THEN** the system generates a "Witt - Basic" note
- **THEN** it populates all fields using data from the Note
- **THEN** if Pronunciation or Comment are missing, those fields are left empty

#### Scenario: Generate context card from Note and Context
- **WHEN** a Note has at least one Context
- **THEN** the system generates up to 5 "Witt - Context" notes (one per Context)
- **THEN** each context note has fields specific to that Context
- **THEN** fields are populated using data from both the Note and Context

#### Scenario: Sentence blanking for context cards
- **WHEN** generating the Sentence field for a context card
- **THEN** the system replaces the word form with a blank
- **EXAMPLE**: "I implemented this feature" becomes "I ______ this feature"
- **THEN** if word form appears multiple times, only the first occurrence is blanked

### Requirement: Incremental sync with Anki
The system SHALL support incremental synchronization, syncing only changed data since the last sync.

#### Scenario: Sync new Note to Anki
- **WHEN** a new Note is created in Witt
- **WHEN** the user initiates a sync
- **THEN** the system creates the corresponding Anki notes
- **THEN** it updates the last sync timestamp for the Note

#### Scenario: Sync updated Note to Anki
- **WHEN** an existing Note is modified in Witt
- **WHEN** the user initiates a sync
- **THEN** the corresponding Anki notes are updated with the new data
- **THEN** the system tracks which fields were changed

#### Scenario: Sync deleted Note to Anki
- **WHEN** a Note is deleted from Witt
- **WHEN** the user initiates a sync
- **THEN** all corresponding Anki notes are deleted from the user's collection
- **THEN** media files associated with the Note are removed from Anki's media folder

### Requirement: Media file synchronization
The system SHALL manage media files (audio and images) between Witt and Anki.

#### Scenario: Send media files to Anki
- **WHEN** an audio or image file is attached to a Context
- **THEN** the file is copied to Anki's media collection during sync
- **THEN** the file is renamed to a UUID to avoid conflicts
- **THEN** the new filename is stored in the Anki note fields

#### Scenario: Remove media files from Anki
- **WHEN** a Context with media is deleted from Witt
- **THEN** the corresponding media file is removed from Anki's media folder
- **THEN** the media file reference is removed from all Anki notes

#### Scenario: Media file verification
- **WHEN** the system detects media files in Anki that are not referenced by any note
- **THEN** it marks them as orphaned media
- **THEN** it provides an option to clean up orphaned media files

### Requirement: Batch synchronization
The system SHALL support batch operations for syncing large numbers of Notes.

#### Scenario: Sync all Notes
- **WHEN** the user clicks "Sync All"
- **THEN** the system syncs all Notes with Anki
- **THEN** it shows a progress indicator with a count of synced items
- **THEN** if errors occur, it provides a list of failed items

#### Scenario: Sync selected Notes
- **WHEN** the user selects one or more Notes and clicks "Sync Selected"
- **THEN** only the selected Notes are synced with Anki
- **THEN** the system provides feedback on the sync status of each selected Note

#### Scenario: Sync progress indicator
- **WHEN** a sync operation is in progress
- **THEN** a progress bar is displayed showing completion percentage
- **THEN** the number of processed items is shown
- **THEN** if sync takes longer than 5 seconds, a "Syncing..." animation is displayed

### Requirement: Sync conflict resolution
The system SHALL detect and resolve conflicts between Witt and Anki data.

#### Scenario: Conflict detection
- **WHEN** both Witt and Anki have changes to the same Note
- **THEN** the system detects the conflict based on modification timestamps
- **THEN** it displays a conflict resolution dialog

#### Scenario: Conflict resolution options
- **WHEN** a conflict is detected
- **THEN** the user is presented with options:
  1. Keep Witt version (overwrite Anki)
  2. Keep Anki version (overwrite Witt)
  3. Merge versions (manual)

#### Scenario: Auto-resolve minor conflicts
- **WHEN** the only changes are to non-critical fields (e.g., tags)
- **THEN** the system automatically merges the changes
- **THEN** the more recent version takes precedence

### Requirement: Error handling during sync
The system SHALL handle errors gracefully during sync operations and provide actionable feedback.

#### Scenario: Anki note type not found
- **WHEN** AnkiConnect responds that the Witt note type is missing
- **THEN** the system attempts to re-create the note type
- **THEN** if re-creation fails, it provides instructions for manual creation

#### Scenario: Media file transfer failure
- **WHEN** a media file fails to transfer to Anki's media folder
- **THEN** the corresponding Anki note is created without the media file
- **THEN** a warning is logged: "Failed to transfer media file: [filename]"

#### Scenario: Sync operation cancellation
- **WHEN** the user cancels a sync operation in progress
- **THEN** the system stops the current operation
- **THEN** it provides a summary of what was synced before cancellation

### Requirement: Anki integration settings
The system SHALL provide settings to configure the Anki integration behavior.

#### Scenario: Configure AnkiConnect port
- **WHEN** the user changes the AnkiConnect port in settings
- **THEN** all future API calls are made to the new port
- **THEN** the new port is saved to the configuration file

#### Scenario: Auto-sync on capture
- **WHEN** the user enables "Auto-sync on capture" in settings
- **THEN** new Notes are automatically synced to Anki after capture
- **THEN** a sync indicator shows when auto-sync is in progress

#### Scenario: Select default deck for new notes
- **WHEN** the user sets a default deck in settings
- **THEN** all new Notes are automatically assigned to this deck
- **THEN** this deck is used as the default in the capture popup

### Requirement: Export to APKG file
The system SHALL support exporting Notes and Contexts as an Anki package (APKG) file.

#### Scenario: Export all Notes to APKG
- **WHEN** the user clicks "Export All to APKG"
- **THEN** the system generates an APKG file containing all Notes and media
- **THEN** the user is prompted to save the file to their computer

#### Scenario: Export selected Notes to APKG
- **WHEN** the user selects one or more Notes and clicks "Export Selected to APKG"
- **THEN** only the selected Notes and their media are included in the APKG file
- **THEN** the file is generated and downloaded

#### Scenario: Include media in APKG export
- **WHEN** the user exports to APKG
- **THEN** all media files (audio and images) are included in the package
- **THEN** media files are properly linked to the corresponding notes

### Requirement: Import from APKG file
The system SHALL support importing Notes and Contexts from an Anki package (APKG) file.

#### Scenario: Import APKG file into Witt
- **WHEN** the user selects an APKG file for import
- **THEN** the system extracts notes and media from the package
- **THEN** it converts Anki notes to Witt Note and Context models
- **THEN** imported notes are added to the Witt library

#### Scenario: Handle duplicate notes during import
- **WHEN** the imported APKG contains a Note that already exists in Witt
- **THEN** the system checks for existing Note by lemma
- **THEN** if duplicate, it offers to merge the Contexts or skip the Note

#### Scenario: Validate imported APKG file
- **WHEN** the user attempts to import an invalid APKG file
- **THEN** the import operation fails
- **THEN** an error message is displayed: "Invalid APKG file"

### Requirement: Anki browser integration
The system SHALL provide integration with Anki's browser for quick review and editing.

#### Scenario: Open in Anki Browser
- **WHEN** the user clicks "Open in Anki Browser" from a Note's detail view
- **THEN** it opens the Anki Browser and searches for the Note's lemma
- **THEN** all Witt notes for that lemma are selected in the Anki Browser

#### Scenario: Quick sync from Anki Browser
- **WHEN** the user edits a Witt note in the Anki Browser and saves
- **THEN** the system detects the change and prompts for sync
- **THEN** the user can sync the changes back to Witt with one click
