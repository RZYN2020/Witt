# Media Management Specification

## Purpose
This specification describes how Witt manages audio and image media files, ensuring compatibility with Anki's media system and providing efficient storage and retrieval.

## Requirements

### Requirement: Media storage structure
The system SHALL store media files in a structured directory hierarchy compatible with Anki's media folder.

#### Scenario: Media directory creation
- **WHEN** the application is first launched
- **THEN** it creates a `media` subdirectory in the application's data directory
- **THEN** the media directory is structured as: `<application_data_dir>/media/`

#### Scenario: Media file naming
- **WHEN** a new media file is saved
- **THEN** it is assigned a UUID as the filename
- **THEN** the filename includes the appropriate extension (e.g., .mp3, .png)
- **EXAMPLE**: `a1b2c3d4-5678-90ef-ghij-klmnopqrstuv.mp3`

#### Scenario: Media directory compatibility
- **WHEN** media files are stored in Witt's media folder
- **THEN** they follow the same structure and naming conventions as Anki's media directory
- **THEN** media files can be directly copied to Anki's media folder without modification

### Requirement: Audio file handling
The system SHALL support audio file upload, playback, and storage.

#### Scenario: Audio file upload from file picker
- **WHEN** the user selects an audio file from the file picker
- **THEN** the file is validated for supported formats
- **THEN** it is saved to the media directory with a UUID filename
- **THEN** a reference to the file is stored in the database

#### Scenario: Audio file format validation
- **WHEN** the user attempts to upload an unsupported audio format
- **THEN** the upload is rejected
- **THEN** an error message is displayed: "Unsupported audio format. Please use MP3, WAV, or OGG files."

#### Scenario: Audio playback
- **WHEN** the user clicks the playback button for an audio file
- **THEN** the audio file is played using the system's audio engine
- **THEN** playback controls are displayed (play/pause, volume)
- **THEN** audio continues to play even if the UI navigates away

### Requirement: Image file handling
The system SHALL support image file upload, display, and storage.

#### Scenario: Image file upload from file picker
- **WHEN** the user selects an image file from the file picker
- **THEN** the file is validated for supported formats
- **THEN** it is saved to the media directory with a UUID filename
- **THEN** a reference to the file is stored in the database

#### Scenario: Image file drag and drop
- **WHEN** the user drags and drops an image file onto the capture popup
- **THEN** the file is automatically uploaded and associated with the current Context
- **THEN** a preview of the image is displayed in the UI

#### Scenario: Image format validation
- **WHEN** the user attempts to upload an unsupported image format
- **THEN** the upload is rejected
- **THEN** an error message is displayed: "Unsupported image format. Please use PNG, JPG, or GIF files."

#### Scenario: Image display optimization
- **WHEN** an image is displayed in the UI
- **THEN** it is resized to fit within the available space
- **THEN** the system preserves aspect ratio
- **THEN** images are lazy-loaded to improve performance

### Requirement: Media file metadata management
The system SHALL track metadata for each media file, including type, size, and associated Note/Context.

#### Scenario: Media metadata storage
- **WHEN** a media file is saved
- **THEN** metadata is stored in the database, including:
  - File path
  - File size (bytes)
  - Media type (audio or image)
  - Original filename (optional)
  - Creation timestamp

#### Scenario: Media metadata retrieval
- **WHEN** media metadata is needed for display or processing
- **THEN** it is retrieved from the database
- **THEN** metadata is cached for performance

#### Scenario: Media file size limits
- **WHEN** the user attempts to upload a media file larger than 5MB
- **THEN** the upload is rejected
- **THEN** an error message is displayed: "File too large. Maximum file size is 5MB."

### Requirement: Media file deletion
The system SHALL properly delete media files and their references.

#### Scenario: Delete media file from Context
- **WHEN** the user deletes a media attachment from a Context
- **THEN** the media file is removed from the media directory
- **THEN** the media reference is removed from the database

#### Scenario: Delete media file when Context is deleted
- **WHEN** a Context with media attachments is deleted
- **THEN** all associated media files are removed from the media directory
- **THEN** media references are removed from the database

#### Scenario: Delete media file when Note is deleted
- **WHEN** a Note with media attachments is deleted
- **THEN** all media files associated with its Contexts are removed from the media directory
- **THEN** media references are removed from the database

### Requirement: Media file verification
The system SHALL verify the integrity of media files and handle missing or corrupted files.

#### Scenario: Check media file existence on startup
- **WHEN** the application starts
- **THEN** it checks all media file references in the database
- **THEN** it identifies media files that are missing from the filesystem
- **THEN** missing media files are logged and displayed in a system report

#### Scenario: Handle missing media file
- **WHEN** the system attempts to access a media file that doesn't exist
- **THEN** it displays a placeholder (audio icon or broken image)
- **THEN** a warning is logged: "Media file not found: [filename]"

#### Scenario: Corrupted media file handling
- **WHEN** the system detects a corrupted media file
- **THEN** it logs a warning: "Corrupted media file: [filename]"
- **THEN** it displays a placeholder in the UI

### Requirement: Media file preview
The system SHALL provide preview functionality for media files in the UI.

#### Scenario: Audio file preview
- **WHEN** an audio file is attached to a Context
- **THEN** a waveform or audio icon is displayed in the UI
- **THEN** clicking the preview plays the audio file

#### Scenario: Image file preview
- **WHEN** an image file is attached to a Context
- **THEN** a thumbnail preview is displayed in the UI
- **THEN** clicking the thumbnail opens the full-size image in a modal

#### Scenario: Media preview in note detail view
- **WHEN** the user views a Note's detail view
- **THEN** all associated media files are displayed with preview functionality
- **THEN** media previews are sized appropriately for the view

### Requirement: Media file search
The system SHALL allow searching for media files based on metadata.

#### Scenario: Search media by file type
- **WHEN** the user searches for audio or image files specifically
- **THEN** the system filters media files by type
- **THEN** search results include media files matching the type

#### Scenario: Search media by original filename
- **WHEN** the user searches for media files by original filename
- **THEN** the system searches media metadata for matching filenames
- **THEN** search results include media files matching the query

### Requirement: Media file export
The system SHALL support media file export for backup and sharing purposes.

#### Scenario: Media file export with APKG
- **WHEN** the user exports Notes to an APKG file
- **THEN** all associated media files are included in the export
- **THEN** media files are properly referenced in the exported Anki package

#### Scenario: Media file export to folder
- **WHEN** the user exports media files to a specific folder
- **THEN** all media files are copied to the selected folder
- **THEN** a report of exported media files is provided

#### Scenario: Media file export verification
- **WHEN** media files are exported
- **THEN** the system verifies that all media files are successfully exported
- **THEN** it provides feedback on any failed exports

### Requirement: Media file compression
The system SHALL compress media files when necessary to optimize storage and sync performance.

#### Scenario: Image compression on upload
- **WHEN** the user uploads a large image file
- **THEN** the system compresses the image to reduce file size
- **THEN** the compressed image maintains sufficient quality for viewing

#### Scenario: Audio compression on upload
- **WHEN** the user uploads an uncompressed audio file (e.g., WAV)
- **THEN** the system compresses it to MP3 format with appropriate quality settings
- **THEN** compression settings are configurable in the application preferences

#### Scenario: Compression quality settings
- **WHEN** the user adjusts media compression quality in settings
- **THEN** future media uploads use the new compression settings
- **THEN** existing media files are not automatically re-compressed

### Requirement: Media file caching
The system SHALL cache media files to improve performance during playback and display.

#### Scenario: Media file memory caching
- **WHEN** a media file is accessed
- **THEN** it is cached in memory for faster subsequent access
- **THEN** cache size is limited to prevent excessive memory usage

#### Scenario: Media file disk caching
- **WHEN** media files are downloaded from external sources
- **THEN** they are cached on disk for offline access
- **THEN** cached files are periodically cleaned up to save disk space

#### Scenario: Cache invalidation
- **WHEN** a media file is modified or deleted
- **THEN** it is removed from the cache
- **THEN** future accesses will retrieve the latest version from disk

### Requirement: Media file backup
The system SHALL provide backup functionality for media files.

#### Scenario: Media file inclusion in backup
- **WHEN** the user creates a backup of their data
- **THEN** all media files are included in the backup
- **THEN** media files are stored in the backup file or folder

#### Scenario: Media file restoration from backup
- **WHEN** the user restores from a backup
- **THEN** media files are restored to their original locations
- **THEN** media references in the database are updated

#### Scenario: Incremental media backup
- **WHEN** the user creates an incremental backup
- **THEN** only modified or new media files are included
- **THEN** the backup process is optimized for speed
