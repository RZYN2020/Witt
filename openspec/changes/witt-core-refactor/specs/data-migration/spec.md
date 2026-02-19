# Data Migration Specification

## Purpose
This specification describes the process for migrating data from the old Card-based model to the new Note-Context model, ensuring a smooth transition for existing users.

## Requirements

### Requirement: Migration process initialization
The system SHALL automatically detect when a migration is needed and initiate the migration process.

#### Scenario: First launch after update
- **WHEN** the application detects that it's the first run with the new data model
- **THEN** it checks if there are old data files to migrate
- **THEN** if old data is found, it initiates the migration process

#### Scenario: Manual migration trigger
- **WHEN** the user manually triggers a migration from the settings
- **THEN** the system checks if old data files are present
- **THEN** it initiates the migration process with user confirmation

#### Scenario: No migration needed
- **WHEN** the application detects that no old data files are present
- **THEN** it skips the migration process
- **THEN** it initializes the new data model with an empty state

### Requirement: Migration backup
The system SHALL create a backup of old data before starting the migration process.

#### Scenario: Automatic backup creation
- **WHEN** the migration process begins
- **THEN** it creates a backup of all old data in a timestamped directory
- **THEN** the backup location is: `<application_data_dir>/backups/<timestamp>/`

#### Scenario: Backup content
- **WHEN** a migration backup is created
- **THEN** it includes:
  - The old database file (if SQLite was used)
  - Any old media files
  - Migration metadata (timestamp, old version, new version)

#### Scenario: Migration backup verification
- **WHEN** the backup is created
- **THEN** the system verifies that the backup process was successful
- **THEN** if the backup fails, the migration process is aborted

### Requirement: Card to Note-Context conversion
The system SHALL convert old Card data to the new Note-Context model.

#### Scenario: Convert single card to Note with Context
- **WHEN** migrating a single old Card
- **THEN** it creates a new Note with the Card's lemma as the primary key
- **THEN** it creates a new Context from the Card's data
- **THEN** the new Note is populated with:
  - lemma: from old Card's lemma
  - definition: from first definition in old Card
  - pronunciation: null (needs to be re-fetched)
  - phonetics: null (needs to be re-fetched)
  - tags: from old Card's tags
  - comment: from old Card's notes
  - deck: "Default" (default deck)
  - contexts: single Context created from old Card

#### Scenario: Merge duplicate Cards with same lemma
- **WHEN** multiple old Cards have the same lemma
- **THEN** they are merged into a single Note
- **THEN** each old Card becomes a separate Context in the new Note
- **THEN** Contexts are ordered by old Card's created_at timestamp
- **THEN** only the first old Card's data is used to populate the Note's metadata

#### Scenario: Handle Cards with missing lemma
- **WHEN** a Card is encountered with no lemma (rare case)
- **THEN** it uses the Card's word field as the lemma
- **THEN** it logs a warning: "Card with missing lemma found, using word field instead"

### Requirement: Context slot management during migration
The system SHALL manage Context slots to ensure no more than 5 Contexts per Note.

#### Scenario: Note with fewer than 5 Contexts
- **WHEN** a merged Note has fewer than 5 Contexts from old Cards
- **THEN** all Contexts are migrated to the new Note
- **THEN** the Note's contexts list will contain all migrated Contexts

#### Scenario: Note with exactly 5 Contexts
- **WHEN** a merged Note has exactly 5 Contexts from old Cards
- **THEN** all 5 Contexts are migrated to the new Note
- **THEN** no changes are made to the Context list

#### Scenario: Note with more than 5 Contexts
- **WHEN** a merged Note has more than 5 Contexts from old Cards
- **THEN** the first 5 Contexts (by created_at timestamp) are migrated
- **THEN** additional Contexts are logged but not migrated
- **THEN** the user is notified that some Contexts were not migrated

### Requirement: Media file migration
The system SHALL migrate media files from the old storage structure to the new format.

#### Scenario: Audio file migration
- **WHEN** an old Card has audio content (if supported in old model)
- **THEN** the audio file is copied to the new media directory
- **THEN** it is assigned a new UUID filename
- **THEN** the new filename is stored in the Context's audio field

#### Scenario: Image file migration
- **WHEN** an old Card has image content (if supported in old model)
- **THEN** the image file is copied to the new media directory
- **THEN** it is assigned a new UUID filename
- **THEN** the new filename is stored in the Context's image field

#### Scenario: Media file compatibility check
- **WHEN** media files are migrated
- **THEN** the system checks if they are in supported formats
- **THEN** unsupported media files are still copied but may not be playable

### Requirement: Migration progress tracking
The system SHALL track migration progress and provide user feedback.

#### Scenario: Migration progress indicator
- **WHEN** the migration process is in progress
- **THEN** a progress bar is displayed showing completion percentage
- **THEN** the number of processed Cards/Notes is shown
- **THEN** estimated time remaining (if available) is displayed

#### Scenario: Migration status updates
- **WHEN** significant migration events occur
- **THEN** the system provides status updates
- **EXAMPLE**: "Migrating Card #123 of 456" or "Processing media files"

#### Scenario: Migration completion message
- **WHEN** the migration process completes
- **THEN** a summary message is displayed
- **THEN** it includes statistics: number of Cards processed, Notes created, Contexts migrated

### Requirement: Migration error handling
The system SHALL handle errors during migration and provide actionable feedback.

#### Scenario: Card processing error
- **WHEN** the system encounters an error while processing a specific Card
- **THEN** it logs the error with details (Card ID, error message)
- **THEN** it continues processing the next Card

#### Scenario: Fatal migration error
- **WHEN** the system encounters a fatal error that prevents migration from continuing
- **THEN** it stops the migration process
- **THEN** it provides an error message explaining the issue
- **THEN** it offers to restore from backup

#### Scenario: Migration rollback
- **WHEN** migration fails and the user chooses to rollback
- **THEN** the system restores the old data from the backup
- **THEN** the application reverts to using the old data model

### Requirement: Post-migration data validation
The system SHALL validate migrated data to ensure consistency and integrity.

#### Scenario: Data consistency checks
- **WHEN** the migration completes
- **THEN** the system performs consistency checks on the migrated data
- **THEN** it verifies that all Notes have at least one Context
- **THEN** it checks that no Note has more than 5 Contexts

#### Scenario: Media file reference checks
- **WHEN** the migration completes
- **THEN** the system checks that all media file references are valid
- **THEN** it identifies media files that are missing or corrupted
- **THEN** it logs any inconsistencies for user review

### Requirement: Migration report generation
The system SHALL generate a detailed migration report.

#### Scenario: Migration report creation
- **WHEN** the migration process completes
- **THEN** it generates a detailed migration report
- **THEN** the report is saved to: `<application_data_dir>/migration_reports/<timestamp>.txt`

#### Scenario: Migration report content
- **WHEN** a migration report is generated
- **THEN** it includes:
  - Migration start and end times
  - Number of Cards processed
  - Number of Notes created
  - Number of Contexts migrated
  - Number of Contexts skipped (due to slot limits)
  - Errors encountered
  - Media file statistics (number of files, total size)

#### Scenario: Migration report display
- **WHEN** the user requests to view the migration report
- **THEN** it is displayed in the application's UI
- **THEN** the user can save or share the report

### Requirement: Migration compatibility with old versions
The system SHALL support migration from multiple old versions to the new model.

#### Scenario: Migration from very old versions
- **WHEN** migrating from versions with significantly different data structures
- **THEN** the system uses a version-aware migration process
- **THEN** it applies the appropriate conversion steps for each old version

#### Scenario: Migration from intermediate versions
- **WHEN** migrating from versions that have already introduced some Note-Context features
- **THEN** the system checks the old version and applies minimal changes
- **THEN** it preserves any existing Note-Context relationships

### Requirement: Migration process optimization
The system SHALL optimize the migration process for large datasets.

#### Scenario: Large dataset migration
- **WHEN** migrating a very large number of Cards (1000+ items)
- **THEN** the system uses batch processing to optimize performance
- **THEN** it provides regular progress updates
- **THEN** it ensures that system resources (CPU, memory) are used efficiently

#### Scenario: Incremental migration
- **WHEN** a partial migration was previously performed and failed
- **THEN** the system detects the partial migration state
- **THEN** it resumes from where the migration left off
- **THEN** it skips already processed items

### Requirement: Migration security
The system SHALL ensure that migration processes are secure and protect user data.

#### Scenario: Data integrity during migration
- **WHEN** data is being migrated
- **THEN** it is properly protected from corruption or loss
- **THEN** all operations are performed in a transactional manner where possible

#### Scenario: Backup security
- **WHEN** migration backups are created
- **THEN** they are stored in a secure location
- **THEN** they are not accessible to other applications
- **THEN** they are automatically encrypted if supported by the OS

### Requirement: Post-migration user guidance
The system SHALL provide guidance to users after migration completes.

#### Scenario: First run after successful migration
- **WHEN** the user launches the application for the first time after migration
- **THEN** it displays a welcome message explaining the changes
- **THEN** it provides links to documentation on the new features

#### Scenario: Migration issues notice
- **WHEN** the migration process completes but with minor issues
- **THEN** it displays a notice of the issues
- **THEN** it provides links to resolve the issues (e.g., media file checking)

#### Scenario: Migration feedback
- **WHEN** the migration completes
- **THEN** the system asks the user if they would like to provide feedback
- **THEN** feedback can help improve future migration processes

### Requirement: Migration rollback support
The system SHALL support rolling back to the old data model if necessary.

#### Scenario: User-initiated rollback
- **WHEN** the user wants to roll back to the old data model
- **THEN** they can trigger a rollback from the settings
- **THEN** the system restores the old data from the migration backup

#### Scenario: Rollback verification
- **WHEN** a rollback is performed
- **THEN** the system verifies that the rollback was successful
- **THEN** it tests that the old data model is functioning correctly

#### Scenario: Rollback consequences
- **WHEN** the user chooses to rollback
- **THEN** it is clearly stated that any changes made after migration will be lost
- **THEN** the user must confirm the rollback operation
