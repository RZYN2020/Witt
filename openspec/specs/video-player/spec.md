# Video Player Specification

## Purpose
This specification describes the video player feature of the Witt application, which provides video playback with subtitle overlay and integration with the capture popup for word learning.

## Requirements

### Requirement: Import video files
The system SHALL allow users to import video files for playback with subtitle overlay.

#### Scenario: User imports video via drag-and-drop
- **WHEN** the user drags a video file (.mp4, .webm, .mkv) onto the Witt window
- **THEN** the video is loaded into the player
- **THEN** playback starts automatically or shows the first frame paused

#### Scenario: User imports video via file picker
- **WHEN** the user clicks "Import Video" in the menu
- **WHEN** the user selects a video file from the file picker
- **THEN** the video is loaded into the player
- **THEN** the video title is displayed in the player header

#### Scenario: Unsupported video format
- **WHEN** the user imports a video in an unsupported format
- **THEN** an error message is shown: "This video format is not supported"
- **THEN** suggestions are offered: "Try converting to MP4 or WebM"

#### Scenario: User imports video with matching subtitle file
- **WHEN** the user imports a video file (e.g., `movie.mp4`)
- **WHEN** a subtitle file with matching name exists in the same folder (e.g., `movie.srt`)
- **THEN** the subtitle file is automatically loaded
- **THEN** a toast confirms: "Subtitles loaded"

### Requirement: HTML5 video playback with custom controls
The system SHALL provide video playback with custom-styled controls matching the Witt aesthetic.

#### Scenario: Basic playback controls
- **WHEN** the user clicks the play button (or presses Space)
- **THEN** the video starts playing
- **THEN** the play button changes to a pause icon

- **WHEN** the user clicks the pause button (or presses Space)
- **THEN** the video pauses
- **THEN** the pause button changes to a play icon

#### Scenario: Seek via timeline
- **WHEN** the user clicks on the timeline/scrubber
- **THEN** the video seeks to that timestamp
- **THEN** playback resumes if it was playing

#### Scenario: Frame-by-frame navigation
- **WHEN** the user presses the left arrow key (←)
- **THEN** the video seeks backward by 1 frame (or 0.5 seconds)
- **THEN** the video remains paused

- **WHEN** the user presses the right arrow key (→)
- **THEN** the video seeks forward by 1 frame (or 0.5 seconds)
- **THEN** the video remains paused

#### Scenario: Playback speed control
- **WHEN** the user clicks the speed button
- **THEN** a dropdown appears with options: 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2×
- **WHEN** the user selects a speed
- **THEN** the video plays at the selected speed
- **THEN** the speed is persisted for this video session

#### Scenario: Volume control
- **WHEN** the user clicks the volume icon
- **THEN** a volume slider appears
- **WHEN** the user adjusts the slider
- **THEN** the video volume changes accordingly
- **THEN** the volume setting is persisted

### Requirement: Subtitle file parsing and display
The system SHALL parse subtitle files (.srt, .vtt, .ass) and display them as an overlay during video playback.

#### Scenario: Load .srt subtitle file
- **WHEN** the user clicks "Load Subtitles" and selects an .srt file
- **THEN** the subtitle file is parsed
- **THEN** subtitles are displayed as an overlay during playback
- **THEN** each subtitle shows at the correct timestamp

#### Scenario: Subtitle styling
- **WHEN** subtitles are displayed
- **THEN** they appear at the bottom center of the video (default position)
- **THEN** the text is white with a semi-transparent black background
- **THEN** the font is large enough to read comfortably (minimum 16px equivalent)

#### Scenario: Subtitle position adjustment
- **WHEN** the user opens subtitle settings
- **THEN** options are available: Position (bottom/middle/top), Font Size, Font Family
- **WHEN** the user changes position
- **THEN** subtitles render at the new position immediately

#### Scenario: Overlapping subtitles are handled
- **WHEN** the subtitle file has overlapping time ranges
- **THEN** only the most recent subtitle is displayed
- **THEN** the transition is smooth (no flickering)

#### Scenario: Subtitle file with encoding issues
- **WHEN** the subtitle file has incorrect character encoding
- **THEN** the system attempts to auto-detect encoding (UTF-8, Latin-1, etc.)
- **WHEN** auto-detection fails
- **THEN** an error is shown: "Could not parse subtitle file. Check encoding."

### Requirement: Capture from video with subtitle context
The system SHALL allow users to capture the current subtitle line as a context for word learning.

#### Scenario: User captures current subtitle
- **WHEN** the user is watching a video with subtitles displayed
- **WHEN** the user presses Ctrl+C (or clicks the capture button)
- **THEN** the current subtitle text is captured
- **THEN** the capture popup opens with the subtitle text pre-filled
- **THEN** the video automatically pauses
- **THEN** the source metadata includes: video filename, current timestamp

#### Scenario: Capture includes frame screenshot (future)
- **WHEN** the user enables "Include screenshot" in settings
- **WHEN** the user captures from video
- **THEN** a screenshot of the current frame is attached to the capture
- **THEN** the screenshot is viewable in the card detail

#### Scenario: User captures while video is playing
- **WHEN** the video is actively playing
- **WHEN** the user presses the capture hotkey
- **THEN** the video pauses
- **THEN** the capture popup opens
- **THEN** after saving, the user can choose to resume playback

#### Scenario: No subtitle at current time
- **WHEN** the user presses capture at a timestamp with no subtitle
- **THEN** a message is shown: "No subtitle at this position"
- **THEN** the user can manually enter text or cancel

### Requirement: Timeline with subtitle markers
The system SHALL display visual markers on the timeline indicating where subtitles appear.

#### Scenario: Subtitle markers are visible
- **WHEN** a video has loaded subtitles
- **THEN** the timeline shows small tick marks or highlighted regions where subtitles occur
- **THEN** denser markers indicate dialogue-heavy sections

#### Scenario: User clicks on subtitle marker
- **WHEN** the user clicks on a subtitle marker in the timeline
- **THEN** the video seeks to that timestamp
- **THEN** the corresponding subtitle is displayed

#### Scenario: Next subtitle navigation
- **WHEN** the user presses Ctrl+N (or clicks "Next" button)
- **THEN** the video seeks to the next subtitle timestamp
- **THEN** the video remains paused (ready for capture)

#### Scenario: Previous subtitle navigation
- **WHEN** the user presses Ctrl+P (or clicks "Prev" button)
- **THEN** the video seeks to the previous subtitle timestamp
- **THEN** the video remains paused

### Requirement: Keyboard shortcuts for video workflow
The system SHALL provide keyboard shortcuts optimized for the "watch and capture" workflow.

#### Scenario: Playback shortcuts
- **WHEN** the user presses Space
- **THEN** playback toggles (play/pause)

- **WHEN** the user presses J
- **THEN** the video seeks backward 10 seconds

- **WHEN** the user presses L
- **THEN** the video seeks forward 10 seconds

- **WHEN** the user presses K
- **THEN** playback toggles (alternative to Space)

#### Scenario: Capture shortcuts
- **WHEN** the user presses Ctrl+C
- **THEN** the current subtitle is captured (video pauses)

- **WHEN** the user presses Ctrl+N
- **THEN** the video seeks to the next subtitle

- **WHEN** the user presses Ctrl+P
- **THEN** the video seeks to the previous subtitle

#### Scenario: Subtitle toggle
- **WHEN** the user presses S
- **THEN** subtitles are toggled on/off

#### Scenario: Speed shortcuts
- **WHEN** the user presses Shift+, (comma)
- **THEN** playback speed decreases (1.0 → 0.75 → 0.5)

- **WHEN** the user presses Shift+. (period)
- **THEN** playback speed increases (0.5 → 0.75 → 1.0 → 1.25 → 1.5 → 2.0)

### Requirement: Video library management
The system SHALL maintain a list of imported videos for quick access.

#### Scenario: Recently watched videos
- **WHEN** the user opens the "Videos" section in the library
- **THEN** recently watched videos are displayed with thumbnails
- **THEN** each video shows: title, last watched timestamp, progress bar

#### Scenario: User resumes a video
- **WHEN** the user clicks on a previously watched video
- **THEN** the video opens at the last watched position
- **THEN** a toast offers: "Start from beginning?" (clickable to seek to 0:00)

#### Scenario: User removes video from library
- **WHEN** the user right-clicks a video in the video library
- **WHEN** the user selects "Remove from library"
- **THEN** the video is removed from the Witt library (file is not deleted from disk)
- **THEN** captured cards from that video are preserved (source metadata remains)

### Requirement: Picture-in-Picture mode (future)
The system SHALL support Picture-in-Picture mode for watching videos while using other applications.

#### Scenario: Enter Picture-in-Picture
- **WHEN** the user clicks the PiP button
- **THEN** the video continues in a floating window
- **THEN** the main Witt window can be minimized or used for other tasks

#### Scenario: Capture from PiP mode
- **WHEN** the video is in PiP mode
- **WHEN** the user presses the global capture hotkey
- **THEN** the capture popup opens with the current subtitle
- **THEN** the PiP window remains visible
