use crate::models::{
    AnkiConfig, AnkiFieldsConfig, AppConfig, AppSettings, EditorConfig, LlmConfig, PipelineConfig,
    PipelineProfile, PromptConfig, PromptProfile,
};
use serde::de::DeserializeOwned;
use std::collections::BTreeMap;

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
        vocabulary_backend_mode: config.settings.vocabulary_backend_mode.clone(),
        visual_memory_scope: config.settings.visual_memory_scope.clone(),
        inline_mini_gloss: config.settings.inline_mini_gloss,
        anki_auto_sync_web: config.settings.anki_auto_sync_web,
        web_mode_enabled: config.settings.web_mode_enabled,
        web_queue_endpoint: config.settings.web_queue_endpoint.clone(),
        web_queue_token: config.settings.web_queue_token.clone(),
    };
    apply_pipeline_to_settings(config, &mut settings);
    settings
}

pub fn update_config_from_settings(config: &mut AppConfig, settings: AppSettings) -> AppSettings {
    config.settings.llm_prompt_id = settings.llm_prompt_id.clone();
    config.settings.anki_pipeline_id = settings.anki_pipeline_id.clone();
    config.settings.selection_auto_ask_ai = settings.selection_auto_ask_ai;
    config.settings.vocabulary_backend_mode = settings.vocabulary_backend_mode.clone();
    config.settings.visual_memory_scope = settings.visual_memory_scope.clone();
    config.settings.inline_mini_gloss = settings.inline_mini_gloss;
    config.settings.anki_auto_sync_web = settings.anki_auto_sync_web;
    config.settings.web_mode_enabled = settings.web_mode_enabled;
    config.settings.web_queue_endpoint = settings.web_queue_endpoint.clone();
    config.settings.web_queue_token = settings.web_queue_token.clone();
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
    sync_selected_pipeline_from_settings(config, &settings);
    normalize_config(config);
    settings_from_config(config)
}

pub fn list_prompts(config: &AppConfig, path: impl Into<String>) -> Vec<PromptProfile> {
    let path = path.into();
    let mut prompts = config
        .prompts
        .iter()
        .map(|(id, prompt)| PromptProfile {
            id: id.clone(),
            name: prompt.name.clone(),
            model: prompt.model.clone(),
            prompt: prompt.prompt.clone(),
            path: path.clone(),
        })
        .collect::<Vec<_>>();
    prompts.sort_by(|a, b| a.name.cmp(&b.name));
    prompts
}

pub fn list_pipelines(config: &AppConfig, path: impl Into<String>) -> Vec<PipelineProfile> {
    let path = path.into();
    let mut pipelines = config
        .pipelines
        .iter()
        .map(|(id, pipeline)| PipelineProfile {
            id: id.clone(),
            name: pipeline.name.clone(),
            mode: pipeline.mode.clone(),
            path: path.clone(),
        })
        .collect::<Vec<_>>();
    pipelines.sort_by(|a, b| a.name.cmp(&b.name));
    pipelines
}

pub fn read_prompt(config: &AppConfig, prompt_id: &str) -> Result<String, String> {
    let prompt = config
        .prompts
        .get(prompt_id)
        .ok_or_else(|| "Prompt not found".to_string())?;
    to_toml(prompt)
}

pub fn save_prompt(config: &mut AppConfig, prompt_id: &str, content: &str) -> Result<(), String> {
    config
        .prompts
        .insert(prompt_id.to_string(), from_toml::<PromptConfig>(content)?);
    normalize_config(config);
    Ok(())
}

pub fn read_pipeline(config: &AppConfig, pipeline_id: &str) -> Result<String, String> {
    let pipeline = config
        .pipelines
        .get(pipeline_id)
        .ok_or_else(|| "Pipeline not found".to_string())?;
    to_toml(pipeline)
}

pub fn save_pipeline(
    config: &mut AppConfig,
    pipeline_id: &str,
    content: &str,
) -> Result<(), String> {
    config.pipelines.insert(
        pipeline_id.to_string(),
        from_toml::<PipelineConfig>(content)?,
    );
    normalize_config(config);
    Ok(())
}

pub fn load_pipeline_settings(config: &mut AppConfig, pipeline_id: &str) -> AppSettings {
    config.settings.anki_pipeline_id = pipeline_id.to_string();
    normalize_config(config);
    settings_from_config(config)
}

pub fn prompt_model(config: &AppConfig, prompt_id: &str) -> Option<String> {
    config
        .prompts
        .get(prompt_id)
        .and_then(|prompt| prompt.model.clone())
}

pub fn config_from_settings(settings: &AppSettings) -> AppConfig {
    let mut config = AppConfig {
        config_version: 1,
        settings: crate::models::ConfigSettings {
            llm_prompt_id: settings.llm_prompt_id.clone(),
            anki_pipeline_id: settings.anki_pipeline_id.clone(),
            selection_auto_ask_ai: settings.selection_auto_ask_ai,
            vocabulary_backend_mode: settings.vocabulary_backend_mode.clone(),
            visual_memory_scope: settings.visual_memory_scope.clone(),
            inline_mini_gloss: settings.inline_mini_gloss,
            anki_auto_sync_web: settings.anki_auto_sync_web,
            web_mode_enabled: settings.web_mode_enabled,
            web_queue_endpoint: settings.web_queue_endpoint.clone(),
            web_queue_token: settings.web_queue_token.clone(),
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

pub fn normalize_config(config: &mut AppConfig) {
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
    if !["hybrid", "anki_first", "witt_first"]
        .contains(&config.settings.vocabulary_backend_mode.as_str())
    {
        config.settings.vocabulary_backend_mode = "hybrid".to_string();
    }
    if !["library", "book"].contains(&config.settings.visual_memory_scope.as_str()) {
        config.settings.visual_memory_scope = "library".to_string();
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

pub fn to_toml<T: serde::Serialize>(value: &T) -> Result<String, String> {
    toml::to_string_pretty(value).map_err(|error| error.to_string())
}

pub fn from_toml<T: DeserializeOwned>(content: &str) -> Result<T, String> {
    toml::from_str(content).map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::{config_from_settings, normalize_config, to_toml, update_config_from_settings};
    use crate::models::AppSettings;

    #[test]
    fn stores_prompts_and_pipelines_as_named_tables() {
        let mut config = config_from_settings(&AppSettings::default());
        normalize_config(&mut config);
        let raw = to_toml(&config).expect("serialize config");
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
        update_config_from_settings(&mut config, settings);
        assert_eq!(
            config
                .pipelines
                .get("default")
                .and_then(|pipeline| pipeline.template.get("meaning"))
                .map(String::as_str),
            Some("{{word}}")
        );
    }
}
