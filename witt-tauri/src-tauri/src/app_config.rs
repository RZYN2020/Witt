use crate::models::{
    AnkiConfig, AnkiFieldsConfig, AppConfig, AppSettings, EditorConfig, LlmConfig, PipelineConfig,
    PipelineProfile, PromptConfig, PromptProfile,
};
use serde::de::DeserializeOwned;
use std::collections::BTreeMap;
use std::fs;
use std::path::Path;
use std::process::Command;

pub fn ensure_config(path: &Path, seed_settings: &AppSettings) -> Result<AppConfig, String> {
    let mut config = if path.exists() {
        read_config(path)?
    } else {
        config_from_settings(seed_settings)
    };
    normalize_config(&mut config);
    write_config(path, &config)?;
    Ok(config)
}

pub fn read_config(path: &Path) -> Result<AppConfig, String> {
    let raw = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let mut config: AppConfig = toml::from_str(&raw).map_err(|error| error.to_string())?;
    normalize_config(&mut config);
    Ok(config)
}

pub fn write_config(path: &Path, config: &AppConfig) -> Result<(), String> {
    let mut normalized = config.clone();
    normalize_config(&mut normalized);
    let content = toml::to_string_pretty(&normalized).map_err(|error| error.to_string())?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::write(path, content).map_err(|error| error.to_string())
}

pub fn settings_from_config(config: &AppConfig) -> AppSettings {
    let mut settings = AppSettings {
        llm_endpoint: config.llm.endpoint.clone(),
        llm_model: config.llm.default_model.clone(),
        llm_prompt_id: config.settings.llm_prompt_id.clone(),
        anki_endpoint: config.anki.endpoint.clone(),
        anki_model_name: config.anki.note_type_name.clone(),
        anki_word_field: config.anki.fields.word.clone(),
        anki_sentence_field: config.anki.fields.sentence.clone(),
        anki_book_field: config.anki.fields.book.clone(),
        anki_chapter_field: config.anki.fields.chapter.clone(),
        anki_meaning_field: config.anki.fields.meaning.clone(),
        anki_preprocess_mode: "template".to_string(),
        anki_pipeline_id: config.settings.anki_pipeline_id.clone(),
        anki_preprocess_template: crate::llm::default_preprocess_template(),
        anki_preprocess_prompt: crate::llm::default_preprocess_prompt().to_string(),
        selection_auto_ask_ai: config.settings.selection_auto_ask_ai,
    };
    apply_pipeline_to_settings(config, &mut settings);
    settings
}

pub fn update_config_from_settings(
    path: &Path,
    settings: AppSettings,
) -> Result<AppSettings, String> {
    let mut config = read_config(path)?;
    config.settings.llm_prompt_id = settings.llm_prompt_id.clone();
    config.settings.anki_pipeline_id = settings.anki_pipeline_id.clone();
    config.settings.selection_auto_ask_ai = settings.selection_auto_ask_ai;
    config.llm.endpoint = settings.llm_endpoint.clone();
    config.llm.default_model = settings.llm_model.clone();
    config.anki.endpoint = settings.anki_endpoint.clone();
    config.anki.note_type_name = settings.anki_model_name.clone();
    config.anki.fields = AnkiFieldsConfig {
        word: settings.anki_word_field.clone(),
        sentence: settings.anki_sentence_field.clone(),
        book: settings.anki_book_field.clone(),
        chapter: settings.anki_chapter_field.clone(),
        meaning: settings.anki_meaning_field.clone(),
    };
    sync_selected_pipeline_from_settings(&mut config, &settings);
    normalize_config(&mut config);
    write_config(path, &config)?;
    Ok(settings_from_config(&config))
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
    let mut prompts = config
        .prompts
        .iter()
        .map(|(id, prompt)| PromptProfile {
            id: id.clone(),
            name: prompt.name.clone(),
            model: prompt.model.clone(),
            prompt: prompt.prompt.clone(),
            path: path.to_string_lossy().to_string(),
        })
        .collect::<Vec<_>>();
    prompts.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(prompts)
}

pub fn list_pipelines(path: &Path) -> Result<Vec<PipelineProfile>, String> {
    let config = read_config(path)?;
    let mut pipelines = config
        .pipelines
        .iter()
        .map(|(id, pipeline)| PipelineProfile {
            id: id.clone(),
            name: pipeline.name.clone(),
            mode: pipeline.mode.clone(),
            path: path.to_string_lossy().to_string(),
        })
        .collect::<Vec<_>>();
    pipelines.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(pipelines)
}

pub fn read_prompt(path: &Path, prompt_id: &str) -> Result<String, String> {
    let config = read_config(path)?;
    let prompt = config
        .prompts
        .get(prompt_id)
        .ok_or_else(|| "Prompt not found".to_string())?;
    to_toml(prompt)
}

pub fn save_prompt(path: &Path, prompt_id: &str, content: &str) -> Result<(), String> {
    let mut config = read_config(path)?;
    config
        .prompts
        .insert(prompt_id.to_string(), from_toml::<PromptConfig>(content)?);
    write_config(path, &config)
}

pub fn read_pipeline(path: &Path, pipeline_id: &str) -> Result<String, String> {
    let config = read_config(path)?;
    let pipeline = config
        .pipelines
        .get(pipeline_id)
        .ok_or_else(|| "Pipeline not found".to_string())?;
    to_toml(pipeline)
}

pub fn save_pipeline(path: &Path, pipeline_id: &str, content: &str) -> Result<(), String> {
    let mut config = read_config(path)?;
    config.pipelines.insert(
        pipeline_id.to_string(),
        from_toml::<PipelineConfig>(content)?,
    );
    write_config(path, &config)
}

pub fn load_pipeline_settings(path: &Path, pipeline_id: &str) -> Result<AppSettings, String> {
    let mut config = read_config(path)?;
    config.settings.anki_pipeline_id = pipeline_id.to_string();
    normalize_config(&mut config);
    write_config(path, &config)?;
    Ok(settings_from_config(&config))
}

pub fn prompt_model(config: &AppConfig, prompt_id: &str) -> Option<String> {
    config
        .prompts
        .get(prompt_id)
        .and_then(|prompt| prompt.model.clone())
}

fn config_from_settings(settings: &AppSettings) -> AppConfig {
    let mut config = AppConfig {
        config_version: 1,
        settings: crate::models::ConfigSettings {
            llm_prompt_id: settings.llm_prompt_id.clone(),
            anki_pipeline_id: settings.anki_pipeline_id.clone(),
            selection_auto_ask_ai: settings.selection_auto_ask_ai,
        },
        llm: LlmConfig {
            endpoint: settings.llm_endpoint.clone(),
            default_model: settings.llm_model.clone(),
        },
        anki: AnkiConfig {
            endpoint: settings.anki_endpoint.clone(),
            note_type_name: settings.anki_model_name.clone(),
            fields: AnkiFieldsConfig {
                word: settings.anki_word_field.clone(),
                sentence: settings.anki_sentence_field.clone(),
                book: settings.anki_book_field.clone(),
                chapter: settings.anki_chapter_field.clone(),
                meaning: settings.anki_meaning_field.clone(),
            },
        },
        editor: EditorConfig::default(),
        prompts: default_prompts(),
        pipelines: default_pipelines(),
    };
    sync_selected_pipeline_from_settings(&mut config, settings);
    config
}

fn normalize_config(config: &mut AppConfig) {
    config.config_version = 1;
    if config.prompts.is_empty() {
        config.prompts = default_prompts();
    }
    if config.pipelines.is_empty() {
        config.pipelines = default_pipelines();
    }
    if config.editor.command.trim().is_empty() {
        config.editor = EditorConfig::default();
    }
    if !config.prompts.contains_key(&config.settings.llm_prompt_id) {
        config.settings.llm_prompt_id = "explain".to_string();
    }
    if !config
        .pipelines
        .contains_key(&config.settings.anki_pipeline_id)
    {
        config.settings.anki_pipeline_id = "default".to_string();
    }
    trim_prompts(config);
}

fn apply_pipeline_to_settings(config: &AppConfig, settings: &mut AppSettings) {
    let Some(pipeline) = config.pipelines.get(&config.settings.anki_pipeline_id) else {
        return;
    };
    settings.anki_pipeline_id = config.settings.anki_pipeline_id.clone();
    settings.anki_preprocess_mode = pipeline.mode.clone();
    settings.anki_preprocess_prompt = if pipeline.prompt.trim().is_empty() {
        crate::llm::default_preprocess_prompt().to_string()
    } else {
        pipeline.prompt.trim().to_string()
    };
    settings.anki_preprocess_template = serde_json::to_string(&pipeline.template)
        .unwrap_or_else(|_| crate::llm::default_preprocess_template());
}

fn sync_selected_pipeline_from_settings(config: &mut AppConfig, settings: &AppSettings) {
    let pipeline = config
        .pipelines
        .entry(config.settings.anki_pipeline_id.clone())
        .or_insert_with(|| PipelineConfig {
            name: config.settings.anki_pipeline_id.clone(),
            mode: "template".to_string(),
            prompt: crate::llm::default_preprocess_prompt().to_string(),
            template: BTreeMap::new(),
        });
    pipeline.mode = settings.anki_preprocess_mode.clone();
    pipeline.prompt = settings.anki_preprocess_prompt.trim().to_string();
    if let Ok(template) =
        serde_json::from_str::<BTreeMap<String, String>>(&settings.anki_preprocess_template)
    {
        pipeline.template = template;
    }
}

pub fn default_prompts() -> BTreeMap<String, PromptConfig> {
    BTreeMap::from([
        (
            "explain".to_string(),
            PromptConfig {
                name: "Explain in context".to_string(),
                model: Some("gpt-4.1-mini".to_string()),
                prompt: "You are a concise reading and language-learning assistant. Explain the selected text in context. Include meaning, grammar or usage notes when helpful, and answer the user question directly.".to_string(),
            },
        ),
        (
            "translate".to_string(),
            PromptConfig {
                name: "Translate and parse".to_string(),
                model: Some("gpt-4.1-mini".to_string()),
                prompt: "Translate the selected text into Chinese, then briefly explain important vocabulary and sentence structure.".to_string(),
            },
        ),
    ])
}

pub fn default_pipelines() -> BTreeMap<String, PipelineConfig> {
    let mut template = BTreeMap::new();
    template.insert("word".to_string(), "{{word}}".to_string());
    template.insert("sentence".to_string(), "{{sentence}}".to_string());
    template.insert("book".to_string(), "{{book_id}}".to_string());
    template.insert("chapter".to_string(), "{{chapter}}".to_string());
    template.insert("meaning".to_string(), String::new());
    BTreeMap::from([(
        "default".to_string(),
        PipelineConfig {
            name: "Default Anki fields".to_string(),
            mode: "template".to_string(),
            prompt: crate::llm::default_preprocess_prompt().to_string(),
            template,
        },
    )])
}

fn trim_prompts(config: &mut AppConfig) {
    for prompt in config.prompts.values_mut() {
        prompt.prompt = prompt.prompt.trim().to_string();
    }
    for pipeline in config.pipelines.values_mut() {
        pipeline.prompt = pipeline.prompt.trim().to_string();
    }
}

fn to_toml<T: serde::Serialize>(value: &T) -> Result<String, String> {
    toml::to_string_pretty(value).map_err(|error| error.to_string())
}

fn from_toml<T: DeserializeOwned>(content: &str) -> Result<T, String> {
    toml::from_str(content).map_err(|error| error.to_string())
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
