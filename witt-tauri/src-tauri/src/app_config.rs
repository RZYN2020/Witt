use crate::models::{AppConfig, AppSettings, PipelineProfile, PromptProfile};
use std::fs;
use std::path::Path;
use std::process::Command;

pub fn ensure_config(path: &Path, seed_settings: &AppSettings) -> Result<AppConfig, String> {
    let config = if path.exists() {
        read_config(path)?
    } else {
        witt_core::app_config::config_from_settings(seed_settings)
    };
    write_config(path, &config)?;
    read_config(path)
}

pub fn read_config(path: &Path) -> Result<AppConfig, String> {
    let raw = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let mut config: AppConfig = toml::from_str(&raw).map_err(|error| error.to_string())?;
    witt_core::app_config::normalize_config(&mut config);
    Ok(config)
}

pub fn write_config(path: &Path, config: &AppConfig) -> Result<(), String> {
    let mut normalized = config.clone();
    witt_core::app_config::normalize_config(&mut normalized);
    let content = toml::to_string_pretty(&normalized).map_err(|error| error.to_string())?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(path, content).map_err(|error| error.to_string())
}

pub fn settings_from_config(config: &AppConfig) -> AppSettings {
    witt_core::app_config::settings_from_config(config)
}

pub fn update_config_from_settings(
    path: &Path,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let mut config = read_config(path)?;
    let updated = witt_core::app_config::update_config_from_settings(&mut config, settings);
    write_config(path, &config)?;
    Ok(updated)
}

pub fn open_config(path: &Path, config: &AppConfig) -> Result<(), String> {
    let path_string = path.to_string_lossy().to_string();
    if try_editor(&config.editor.command, &config.editor.args, &path_string) {
        return Ok(());
    }
    if try_editor("code", &["-r".to_string()], &path_string) {
        return Ok(());
    }
    open_with_system_default(&path_string)
}

pub fn list_prompts(path: &Path) -> Result<Vec<PromptProfile>, String> {
    let config = read_config(path)?;
    Ok(witt_core::app_config::list_prompts(
        &config,
        path.to_string_lossy().to_string(),
    ))
}

pub fn list_pipelines(path: &Path) -> Result<Vec<PipelineProfile>, String> {
    let config = read_config(path)?;
    Ok(witt_core::app_config::list_pipelines(
        &config,
        path.to_string_lossy().to_string(),
    ))
}

pub fn read_prompt(path: &Path, prompt_id: &str) -> Result<String, String> {
    let config = read_config(path)?;
    witt_core::app_config::read_prompt(&config, prompt_id)
}

pub fn save_prompt(path: &Path, prompt_id: &str, content: &str) -> Result<(), String> {
    let mut config = read_config(path)?;
    witt_core::app_config::save_prompt(&mut config, prompt_id, content)?;
    write_config(path, &config)
}

pub fn read_pipeline(path: &Path, pipeline_id: &str) -> Result<String, String> {
    let config = read_config(path)?;
    witt_core::app_config::read_pipeline(&config, pipeline_id)
}

pub fn save_pipeline(path: &Path, pipeline_id: &str, content: &str) -> Result<(), String> {
    let mut config = read_config(path)?;
    witt_core::app_config::save_pipeline(&mut config, pipeline_id, content)?;
    write_config(path, &config)
}

pub fn load_pipeline_settings(path: &Path, pipeline_id: &str) -> Result<AppSettings, String> {
    let mut config = read_config(path)?;
    let settings = witt_core::app_config::load_pipeline_settings(&mut config, pipeline_id);
    write_config(path, &config)?;
    Ok(settings)
}

pub fn prompt_model(config: &AppConfig, prompt_id: &str) -> Option<String> {
    witt_core::app_config::prompt_model(config, prompt_id)
}

fn try_editor(command: &str, args: &[String], path: &str) -> bool {
    if command.trim().is_empty() {
        return false;
    }
    Command::new(command).args(args).arg(path).spawn().is_ok()
}

fn open_with_system_default(path: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", path])
            .spawn()
            .map_err(|error| error.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|error| error.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::{ensure_config, read_config, update_config_from_settings};
    use crate::models::AppSettings;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn stores_prompts_and_pipelines_as_named_tables() {
        let path = temp_path("witt-config-test");

        ensure_config(&path, &AppSettings::default()).expect("create config");
        let raw = fs::read_to_string(&path).expect("read config");
        assert!(raw.contains("config_version = 1"));
        assert!(raw.contains("[prompts.explain]"));
        assert!(raw.contains("[pipelines.default]"));
        assert!(raw.contains("[pipelines.default.template]"));
        assert!(!raw.contains("[[prompts]]"));
        assert!(!raw.contains("[[pipelines]]"));

        let settings = AppSettings {
            anki_preprocess_template: r#"{"word":"{{word}}","sentence":"{{sentence}}","book":"{{book_id}}","chapter":"{{chapter}}","meaning":"{{word}}"}"#.to_string(),
            ..AppSettings::default()
        };
        update_config_from_settings(&path, settings).expect("update settings");
        let config = read_config(&path).expect("reload config");
        assert_eq!(
            config
                .pipelines
                .get("default")
                .and_then(|pipeline| pipeline.template.get("meaning"))
                .map(String::as_str),
            Some("{{word}}")
        );

        let _ = fs::remove_file(path);
    }

    fn temp_path(prefix: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!(
            "{}-{}.toml",
            prefix,
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ))
    }
}
