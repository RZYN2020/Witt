use crate::{db, db_settings};
use rusqlite::Connection;
use std::path::{Path, PathBuf};

pub struct StorageState {
    pub conn: Connection,
    pub app_dir: PathBuf,
    pub books_dir: PathBuf,
    pub config_path: PathBuf,
}

impl StorageState {
    pub fn new(app_dir: impl AsRef<Path>) -> Result<Self, String> {
        let app_dir = app_dir.as_ref().to_path_buf();
        std::fs::create_dir_all(&app_dir).map_err(|error| error.to_string())?;
        let books_dir = create_app_subdir(&app_dir, "books")?;
        let db_path = app_dir.join("witt.sqlite3");
        let conn = db::open_database(&db_path)?;
        let config_path = app_dir.join("settings.toml");
        Ok(Self {
            conn,
            app_dir,
            books_dir,
            config_path,
        })
    }

    pub fn seed_settings(&self) -> Result<(), String> {
        let settings = db_settings::get_settings(&self.conn)?;
        db_settings::save_settings(&self.conn, &settings)
    }
}

pub fn create_app_subdir(app_dir: &Path, name: &str) -> Result<PathBuf, String> {
    let dir = app_dir.join(name);
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}
