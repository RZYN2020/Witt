use crate::models::Book;
use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

pub struct ImportedBook {
    pub book: Book,
}

pub fn import_book_file(source_path: &str, books_dir: &Path) -> Result<ImportedBook, String> {
    let source = PathBuf::from(source_path);
    if !source.exists() {
        return Err("Book file does not exist".to_string());
    }
    if source
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        != "epub"
    {
        return Err("Only EPUB files can be imported".to_string());
    }

    fs::create_dir_all(books_dir).map_err(|error| error.to_string())?;
    let id = Uuid::new_v4().to_string();
    let target = books_dir.join(format!("{}.epub", id));
    fs::copy(&source, &target).map_err(|error| error.to_string())?;
    let title = source
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("Untitled")
        .to_string();
    let now = Utc::now().to_rfc3339();
    Ok(ImportedBook {
        book: Book {
            id,
            title,
            author: "Unknown author".to_string(),
            file_path: target.to_string_lossy().to_string(),
            cover_path: None,
            imported_at: now.clone(),
            updated_at: now,
        },
    })
}

pub fn read_book_bytes(file_path: &str) -> Result<Vec<u8>, String> {
    fs::read(file_path).map_err(|error| error.to_string())
}
