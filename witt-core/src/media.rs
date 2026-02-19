/*!
Media management for WittCore - handles audio and image files
*/

use serde::{Deserialize, Serialize};
use std::path::Path;

/// Media manager for handling audio and image files
pub struct MediaManager {
    media_dir: std::path::PathBuf,
}

impl MediaManager {
    /// Creates a new MediaManager
    pub fn new(media_dir: &Path) -> Result<Self, crate::WittCoreError> {
        let dir = media_dir.to_path_buf();
        if !dir.exists() {
            std::fs::create_dir_all(&dir)?;
        }

        Ok(MediaManager { media_dir: dir })
    }

    /// Saves an audio file from a byte stream
    pub fn save_audio(&self, audio_bytes: &[u8], extension: &str) -> Result<Audio, crate::WittCoreError> {
        let filename = self.generate_filename(extension);
        let file_path = self.media_dir.join(&filename);

        std::fs::write(&file_path, audio_bytes)?;

        Ok(Audio {
            file_path: filename,
        })
    }

    /// Saves an image file from a byte stream
    pub fn save_image(&self, image_bytes: &[u8], extension: &str) -> Result<Image, crate::WittCoreError> {
        let filename = self.generate_filename(extension);
        let file_path = self.media_dir.join(&filename);

        std::fs::write(&file_path, image_bytes)?;

        Ok(Image {
            file_path: filename,
        })
    }

    /// Reads an audio file from disk
    pub fn read_audio(&self, audio: &Audio) -> Result<Vec<u8>, crate::WittCoreError> {
        let file_path = self.media_dir.join(&audio.file_path);

        if !file_path.exists() {
            return Err(crate::WittCoreError::MediaNotFound(audio.file_path.clone()));
        }

        Ok(std::fs::read(file_path)?)
    }

    /// Reads an image file from disk
    pub fn read_image(&self, image: &Image) -> Result<Vec<u8>, crate::WittCoreError> {
        let file_path = self.media_dir.join(&image.file_path);

        if !file_path.exists() {
            return Err(crate::WittCoreError::MediaNotFound(image.file_path.clone()));
        }

        Ok(std::fs::read(file_path)?)
    }

    /// Deletes an audio file
    pub fn delete_audio(&self, audio: &Audio) -> Result<(), crate::WittCoreError> {
        let file_path = self.media_dir.join(&audio.file_path);

        if file_path.exists() {
            std::fs::remove_file(file_path)?;
        }

        Ok(())
    }

    /// Deletes an image file
    pub fn delete_image(&self, image: &Image) -> Result<(), crate::WittCoreError> {
        let file_path = self.media_dir.join(&image.file_path);

        if file_path.exists() {
            std::fs::remove_file(file_path)?;
        }

        Ok(())
    }

    /// Returns the full path to a media file
    pub fn get_full_path(&self, file_path: &str) -> std::path::PathBuf {
        self.media_dir.join(file_path)
    }

    /// Returns true if the media file exists
    pub fn media_exists(&self, file_path: &str) -> bool {
        self.get_full_path(file_path).exists()
    }

    /// Generates a unique filename using UUID
    fn generate_filename(&self, extension: &str) -> String {
        let uuid = uuid::Uuid::new_v4();
        format!("{}.{}", uuid.to_string(), extension)
    }

    /// Cleans up orphaned media files
    pub fn clean_orphaned_media(&self, used_files: Vec<String>) -> Result<Vec<String>, crate::WittCoreError> {
        let mut deleted_files = Vec::new();

        for entry in std::fs::read_dir(&self.media_dir)? {
            let entry = entry?;
            let path = entry.path();

            if path.is_file() {
                let filename = path
                    .file_name()
                    .unwrap()
                    .to_str()
                    .unwrap()
                    .to_string();

                if !used_files.contains(&filename) {
                    std::fs::remove_file(path)?;
                    deleted_files.push(filename);
                }
            }
        }

        Ok(deleted_files)
    }

    /// Returns the number of media files in the media directory
    pub fn media_count(&self) -> Result<usize, crate::WittCoreError> {
        let mut count = 0;

        for entry in std::fs::read_dir(&self.media_dir)? {
            let entry = entry?;
            if entry.path().is_file() {
                count += 1;
            }
        }

        Ok(count)
    }
}

/// Audio file reference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Audio {
    /// File path to the audio file (relative to media dir)
    pub file_path: String,
}

impl Audio {
    /// Creates a new Audio instance from a file path
    pub fn new(file_path: &str) -> Audio {
        Audio {
            file_path: file_path.to_string(),
        }
    }
}

/// Image file reference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Image {
    /// File path to the image file (relative to media dir)
    pub file_path: String,
}

impl Image {
    /// Creates a new Image instance from a file path
    pub fn new(file_path: &str) -> Image {
        Image {
            file_path: file_path.to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_media_manager_creation() {
        let temp_dir = tempdir().unwrap();
        let manager = MediaManager::new(temp_dir.path()).unwrap();

        assert_eq!(manager.media_dir.to_str().unwrap(), temp_dir.path().to_str().unwrap());
        assert!(manager.media_count().unwrap() == 0);
    }

    #[test]
    fn test_save_and_read_audio() {
        let temp_dir = tempdir().unwrap();
        let manager = MediaManager::new(temp_dir.path()).unwrap();

        // Create test audio bytes
        let test_bytes: Vec<u8> = vec![0; 100];

        // Save audio
        let audio = manager.save_audio(&test_bytes, "mp3").unwrap();

        // Verify it exists
        assert!(manager.media_exists(&audio.file_path));

        // Read it back
        let read_bytes = manager.read_audio(&audio).unwrap();

        // Verify contents
        assert_eq!(test_bytes, read_bytes);
    }

    #[test]
    fn test_save_and_read_image() {
        let temp_dir = tempdir().unwrap();
        let manager = MediaManager::new(temp_dir.path()).unwrap();

        // Create test image bytes
        let test_bytes: Vec<u8> = vec![0; 100];

        // Save image
        let image = manager.save_image(&test_bytes, "png").unwrap();

        // Verify it exists
        assert!(manager.media_exists(&image.file_path));

        // Read it back
        let read_bytes = manager.read_image(&image).unwrap();

        // Verify contents
        assert_eq!(test_bytes, read_bytes);
    }

    #[test]
    fn test_delete_audio() {
        let temp_dir = tempdir().unwrap();
        let manager = MediaManager::new(temp_dir.path()).unwrap();

        let test_bytes: Vec<u8> = vec![0; 100];
        let audio = manager.save_audio(&test_bytes, "mp3").unwrap();

        assert!(manager.media_exists(&audio.file_path));

        manager.delete_audio(&audio).unwrap();

        assert!(!manager.media_exists(&audio.file_path));
    }

    #[test]
    fn test_clean_orphaned_media() {
        let temp_dir = tempdir().unwrap();
        let manager = MediaManager::new(temp_dir.path()).unwrap();

        let test_bytes: Vec<u8> = vec![0; 100];
        let audio1 = manager.save_audio(&test_bytes, "mp3").unwrap();
        let audio2 = manager.save_audio(&test_bytes, "mp3").unwrap();

        let deleted_files = manager.clean_orphaned_media(vec![audio1.file_path.clone()]).unwrap();

        assert!(deleted_files.contains(&audio2.file_path));
        assert!(!deleted_files.contains(&audio1.file_path));
    }
}
