use crate::{app_config, db};
use rusqlite::Connection;
use std::path::PathBuf;
use tauri::Manager;
use tokio::sync::Mutex;

pub struct AppState {
    pub conn: Mutex<Connection>,
    pub books_dir: PathBuf,
    pub config_path: PathBuf,
}

impl AppState {
    pub fn new(app: &tauri::AppHandle) -> Result<Self, String> {
        let app_dir = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?;
        std::fs::create_dir_all(&app_dir).map_err(|error| error.to_string())?;

        let books_dir = create_app_subdir(&app_dir, "books")?;
        let db_path = app_dir.join("witt.sqlite3");
        let conn = db::open_database(&db_path)?;
        let config_path = app_dir.join("settings.toml");
        let config = app_config::ensure_config(&config_path, &db::get_settings(&conn)?)?;
        db::save_settings(&conn, &app_config::settings_from_config(&config))?;
        Ok(Self {
            conn: Mutex::new(conn),
            books_dir,
            config_path,
        })
    }
}

fn create_app_subdir(app_dir: &std::path::Path, name: &str) -> Result<PathBuf, String> {
    let dir = app_dir.join(name);
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir)
}
