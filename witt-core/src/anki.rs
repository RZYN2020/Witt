/*!
Anki integration for WittCore using anki_bridge
*/

use crate::note::{Context, Note, Source};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::path::Path;

/// Sync result from Anki synchronization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    /// Whether the sync was successful
    pub success: bool,
    /// Number of notes created
    pub created: usize,
    /// Number of notes updated
    pub updated: usize,
    /// List of failed syncs with error details
    pub failed: Vec<SyncError>,
}

/// Sync error details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncError {
    /// Lemma of the failed note
    pub lemma: String,
    /// Error message
    pub error: String,
}

// anki_bridge types for note creation
#[derive(Debug, Clone, Default, Serialize)]
struct BridgeNote {
    deck_name: String,
    model_name: String,
    fields: HashMap<String, String>,
    tags: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize)]
struct AddNotesParams {
    notes: Vec<BridgeNote>,
}

/// Client for AnkiConnect communication
pub struct AnkiClient {
    client: reqwest::Client,
    endpoint: String,
}

#[allow(dead_code)]
impl AnkiClient {
    /// Creates a new AnkiClient with default endpoint
    pub fn new() -> Self {
        Self::with_endpoint("http://localhost:8765".to_string())
    }

    /// Creates a new AnkiClient with custom endpoint
    pub fn with_endpoint(endpoint: String) -> Self {
        AnkiClient {
            client: reqwest::Client::new(),
            endpoint,
        }
    }

    /// Checks if AnkiConnect is reachable
    pub async fn is_available(&self) -> bool {
        self.version().await.is_ok()
    }

    /// Gets the AnkiConnect version
    pub async fn version(&self) -> Result<u32, crate::WittCoreError> {
        let result = self.request("version", json!({})).await?;
        result.as_u64().map(|v| v as u32).ok_or_else(|| {
            crate::WittCoreError::AnkiConnect("Invalid version response".to_string())
        })
    }

    /// Ensures that the specified note type exists in Anki
    pub async fn ensure_note_type_exists(&self, note_type: &str) -> Result<bool, crate::WittCoreError> {
        let result: serde_json::Value = self.request(
            "getNoteTypes",
            json!({}),
        ).await?;

        let empty_vec = Vec::new();
        let note_types = result.as_array().unwrap_or(&empty_vec);

        if note_types.iter().any(|nt| nt.as_str() == Some(note_type)) {
            Ok(true)
        } else {
            self.create_witt_note_types().await
        }
    }

    /// Ensures that the specified deck exists in Anki
    pub async fn ensure_deck_exists(&self, deck: &str) -> Result<bool, crate::WittCoreError> {
        let result: serde_json::Value = self.request(
            "getDeckNames",
            json!({}),
        ).await?;

        let empty_vec = Vec::new();
        let decks = result.as_array().unwrap_or(&empty_vec);

        if decks.iter().any(|d| d.as_str() == Some(deck)) {
            Ok(true)
        } else {
            self.create_deck(deck).await
        }
    }

    /// Creates Witt note types if they don't exist
    pub async fn create_witt_note_types(&self) -> Result<bool, crate::WittCoreError> {
        // Create basic note type
        self.create_note_type(
            "Witt - Basic",
            vec![
                "Lemma", "Phonetics", "Pronunciation", "Definition", "Contexts", "Comment"
            ],
            "WittBasicFront",
            "WittBasicBack",
        ).await?;

        // Create context note type
        self.create_note_type(
            "Witt - Context",
            vec![
                "Lemma", "Phonetics", "Pronunciation", "WordForm", "Sentence",
                "ContextAudio", "Image", "Source", "Comment", "OtherContexts"
            ],
            "WittContextFront",
            "WittContextBack",
        ).await?;

        Ok(true)
    }

    /// Syncs a Note to Anki
    pub async fn sync_note(&self, note: &Note) -> Result<Vec<usize>, crate::WittCoreError> {
        let mut anki_notes = Vec::new();

        // 1. Basic note
        anki_notes.push(self.create_basic_anki_note(note));

        // 2. Context notes (up to 5)
        for (i, context) in note.contexts.iter().enumerate().take(5) {
            anki_notes.push(self.create_context_anki_note(note, context, i));
        }

        // Add notes to Anki
        self.add_notes(anki_notes).await
    }

    /// Syncs multiple Notes to Anki
    pub async fn sync_notes(&self, notes: &[Note]) -> Result<SyncResult, crate::WittCoreError> {
        let mut created = 0;
        let mut failed = Vec::new();

        for note in notes {
            match self.sync_note(note).await {
                Ok(ids) => {
                    created += ids.len();
                }
                Err(e) => {
                    failed.push(SyncError {
                        lemma: note.lemma.clone(),
                        error: e.to_string(),
                    });
                }
            }
        }

        Ok(SyncResult {
            success: failed.is_empty(),
            created,
            updated: 0,
            failed,
        })
    }

    /// Generates APKG file from Notes
    /// For now, exports to JSON as APKG generation requires genanki-rs
    pub fn generate_apkg<P: AsRef<Path>>(notes: Vec<Note>, output_path: P) -> Result<(), crate::WittCoreError> {
        use std::fs::File;
        use std::io::Write;
        
        let path = output_path.as_ref();
        
        // Create export data structure
        let export_data = serde_json::json!({
            "version": 1,
            "exported_at": chrono::Utc::now().to_rfc3339(),
            "notes_count": notes.len(),
            "notes": notes.iter().map(|note| {
                serde_json::json!({
                    "lemma": note.lemma,
                    "definition": note.definition,
                    "phonetics": note.phonetics,
                    "pronunciation": note.pronunciation.as_ref().map(|a| &a.file_path),
                    "tags": note.tags,
                    "comment": note.comment,
                    "deck": note.deck,
                    "contexts": note.contexts.iter().map(|ctx| {
                        serde_json::json!({
                            "word_form": ctx.word_form,
                            "sentence": ctx.sentence,
                            "audio": ctx.audio.as_ref().map(|a| &a.file_path),
                            "image": ctx.image.as_ref().map(|i| &i.file_path),
                            "source": ctx.source,
                        })
                    }).collect::<Vec<_>>(),
                })
            }).collect::<Vec<_>>(),
        });

        // Write to file
        let mut file = File::create(path)
            .map_err(|e| crate::WittCoreError::Io(e))?;
        
        let json_string = serde_json::to_string_pretty(&export_data)
            .map_err(|e| crate::WittCoreError::Serialization(e))?;
        
        file.write_all(json_string.as_bytes())
            .map_err(|e| crate::WittCoreError::Io(e))?;

        log::info!("Exported {} notes to {:?}", notes.len(), path);
        Ok(())
    }

    /// Sends a request to AnkiConnect
    async fn request<T: serde::Serialize>(
        &self,
        action: &str,
        params: T,
    ) -> Result<serde_json::Value, crate::WittCoreError> {
        let request_body = json!({
            "action": action,
            "version": 6,
            "params": params
        });

        let response = self.client
            .post(&self.endpoint)
            .json(&request_body)
            .send()
            .await?;

        let result: serde_json::Value = response.json().await?;

        if let Some(error) = result.get("error") {
            if !error.is_null() {
                return Err(crate::WittCoreError::AnkiConnect(
                    error.as_str().unwrap_or("Unknown AnkiConnect error").to_string(),
                ));
            }
        }

        Ok(result.get("result").cloned().unwrap_or(serde_json::Value::Null))
    }

    /// Creates a new deck
    async fn create_deck(&self, deck_name: &str) -> Result<bool, crate::WittCoreError> {
        self.request("createDeck", json!({ "deck": deck_name })).await?;
        Ok(true)
    }

    /// Gets all deck names
    pub async fn get_deck_names(&self) -> Result<Vec<String>, crate::WittCoreError> {
        let result = self.request("getDeckNames", json!({})).await?;
        result.as_array()
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .ok_or_else(|| crate::WittCoreError::AnkiConnect("Invalid deck names response".to_string()))
    }

    /// Creates a new note type
    async fn create_note_type(
        &self,
        name: &str,
        fields: Vec<&str>,
        _front_template: &str,
        _back_template: &str,
    ) -> Result<bool, crate::WittCoreError> {
        let model_params = json!({
            "modelName": name,
            "inOrderFields": fields,
            "css": self.default_css(),
            "isCloze": false,
            "cardTemplates": [
                {
                    "Name": "Card 1",
                    "Front": self.basic_front_template(),
                    "Back": self.basic_back_template()
                }
            ]
        });

        self.request("createModel", model_params).await?;

        Ok(true)
    }

    /// Creates a basic note from Witt Note
    fn create_basic_anki_note(&self, note: &Note) -> BridgeNote {
        let mut fields = HashMap::new();
        fields.insert("Lemma".to_string(), note.lemma.clone());
        fields.insert("Phonetics".to_string(), note.phonetics.clone().unwrap_or_default());
        fields.insert("Pronunciation".to_string(), note.pronunciation.as_ref()
            .map(|a| a.file_path.clone()).unwrap_or_default());
        fields.insert("Definition".to_string(), note.definition.clone());
        // Temporarily skip contexts due to type mismatch
        fields.insert("Contexts".to_string(), String::new());
        fields.insert("Comment".to_string(), note.comment.clone());

        BridgeNote {
            deck_name: note.deck.clone(),
            model_name: "Witt - Basic".to_string(),
            fields,
            tags: note.tags.clone(),
            ..Default::default()
        }
    }

    /// Creates a context note from Witt Note and Context
    fn create_context_anki_note(&self, note: &Note, context: &Context, slot_index: usize) -> BridgeNote {
        let mut fields = HashMap::new();
        fields.insert("Lemma".to_string(), note.lemma.clone());
        fields.insert("Phonetics".to_string(), note.phonetics.clone().unwrap_or_default());
        fields.insert("Pronunciation".to_string(), note.pronunciation.as_ref()
            .map(|a| a.file_path.clone()).unwrap_or_default());
        fields.insert("WordForm".to_string(), context.word_form.clone());
        fields.insert("Sentence".to_string(), self.blank_word_in_sentence(&context));
        fields.insert("ContextAudio".to_string(), context.audio.as_ref()
            .map(|a| a.file_path.clone()).unwrap_or_default());
        fields.insert("Image".to_string(), context.image.as_ref()
            .map(|i| i.file_path.clone()).unwrap_or_default());
        fields.insert("Source".to_string(), self.source_to_html(&context.source));
        fields.insert("Comment".to_string(), note.comment.clone());
        fields.insert("OtherContexts".to_string(), self.other_contexts_to_html(note, &context));

        BridgeNote {
            deck_name: note.deck.clone(),
            model_name: "Witt - Context".to_string(),
            fields,
            tags: self.context_tags(&context, slot_index),
            ..Default::default()
        }
    }

    /// Blanks the word form in the sentence
    fn blank_word_in_sentence(&self, context: &Context) -> String {
        context.sentence.replace(&context.word_form, "______")
    }

    /// Converts contexts to HTML
    fn contexts_to_html(&self, contexts: &[Context]) -> String {
        let mut html = String::new();

        for context in contexts {
            html.push_str(&format!("<p><strong>Word: </strong>{}</p>", context.word_form));
            html.push_str(&format!("<p><strong>Sentence: </strong>{}</p>", context.sentence));
            if context.audio.is_some() {
                html.push_str(&format!("<p><audio src=\"{}\" controls></audio></p>",
                    context.audio.as_ref().unwrap().file_path));
            }
            if context.image.is_some() {
                html.push_str(&format!("<p><img src=\"{}\" alt=\"Context image\"></p>",
                    context.image.as_ref().unwrap().file_path));
            }
            html.push_str(&format!("<p><strong>Source: </strong>{}</p>",
                self.source_to_plain_text(&context.source)));
            html.push_str("<hr>");
        }

        html
    }

    /// Converts source to HTML
    fn source_to_html(&self, source: &Source) -> String {
        match source {
            Source::Web { title, url, .. } => format!(
                "<p><a href=\"{}\" target=\"_blank\">{}</a></p>",
                url, title
            ),
            Source::Video { filename, timestamp, .. } => format!(
                "<p>Video: {} @ {}</p>",
                filename, timestamp
            ),
            Source::Pdf { filename, page } => format!(
                "<p>PDF: {} (Page {})</p>",
                filename, page.as_ref().unwrap_or(&0)
            ),
            Source::App { name, title } => format!(
                "<p>{} {}</p>",
                name, title.as_ref().unwrap_or(&String::new())
            ),
        }
    }

    /// Converts source to plain text
    fn source_to_plain_text(&self, source: &Source) -> String {
        match source {
            Source::Web { title, url, .. } => format!("{} ({})", title, url),
            Source::Video { filename, timestamp, .. } => format!("{} @ {}", filename, timestamp),
            Source::Pdf { filename, page } => format!("{} (Page {})", filename, page.as_ref().unwrap_or(&0)),
            Source::App { name, title } => format!("{} {}", name, title.as_ref().unwrap_or(&String::new())),
        }
    }

    /// Converts other contexts to HTML
    fn other_contexts_to_html(&self, note: &Note, current_context: &Context) -> String {
        let mut html = String::new();
        html.push_str("<ul>");

        for context in &note.contexts {
            if context.id == current_context.id {
                continue;
            }

            html.push_str(&format!("<li><strong>{}:</strong> {}</li>",
                context.word_form,
                self.truncate_sentence(&context.sentence)));
        }

        html.push_str("</ul>");
        html
    }

    /// Truncates a sentence to a certain length
    fn truncate_sentence(&self, sentence: &str) -> String {
        if sentence.len() > 100 {
            format!("{}...", &sentence[..100])
        } else {
            sentence.to_string()
        }
    }

    /// Generates context-specific tags
    fn context_tags(&self, context: &Context, slot_index: usize) -> Vec<String> {
        let mut tags = Vec::new();
        tags.push(format!("context:{}", slot_index + 1));

        match &context.source {
            Source::Web { title: _, url, .. } => {
                tags.push("source:web".to_string());
                tags.push(format!("website:{}", self.clean_domain(url)));
            }
            Source::Video { filename, timestamp: _, .. } => {
                tags.push("source:video".to_string());
                tags.push(format!("video:{}", filename));
            }
            Source::Pdf { filename, page: _ } => {
                tags.push("source:pdf".to_string());
                tags.push(format!("pdf:{}", filename));
            }
            Source::App { name, title: _ } => {
                tags.push("source:app".to_string());
                tags.push(format!("app:{}", name));
            }
        }

        tags
    }

    /// Cleans a domain name for tagging
    fn clean_domain(&self, url: &str) -> String {
        url.replace("http://", "")
            .replace("https://", "")
            .replace("www.", "")
            .split('/')
            .next()
            .unwrap_or("unknown")
            .to_lowercase()
    }

    /// Default CSS for cards
    fn default_css(&self) -> String {
        String::from(r#"
            .card {
                font-family: Arial, sans-serif;
                font-size: 18px;
                text-align: center;
                color: black;
                background-color: white;
            }
            .phonetics {
                font-style: italic;
                color: gray;
                margin-bottom: 10px;
            }
            .definition {
                font-weight: bold;
                font-size: 20px;
                margin: 15px 0;
            }
            .sentence {
                font-style: italic;
                margin: 10px 0;
            }
            .context-image {
                max-width: 300px;
                max-height: 200px;
                margin: 10px 0;
            }
            .source {
                font-size: 14px;
                color: blue;
                margin-top: 15px;
            }
            .other-contexts {
                font-size: 14px;
                margin-top: 15px;
            }
        "#)
    }

    /// Basic front template
    fn basic_front_template(&self) -> String {
        String::from(r#"
            <div class="card">
                <h1>{{Lemma}}</h1>
                {{#Phonetics}}
                <div class="phonetics">{{Phonetics}}</div>
                {{/Phonetics}}
                {{#Pronunciation}}
                <audio src="{{Pronunciation}}" autoplay></audio>
                {{/Pronunciation}}
            </div>
        "#)
    }

    /// Basic back template
    fn basic_back_template(&self) -> String {
        String::from(r#"
            <div class="card">
                <h1>{{Lemma}}</h1>
                {{#Phonetics}}
                <div class="phonetics">{{Phonetics}}</div>
                {{/Phonetics}}
                <div class="definition">{{Definition}}</div>
                {{#Contexts}}
                <div class="contexts">{{Contexts}}</div>
                {{/Contexts}}
                {{#Comment}}
                <div class="comment">{{Comment}}</div>
                {{/Comment}}
            </div>
        "#)
    }
}

impl AnkiClient {
    /// Creates a Vec<BridgeNote> from AnkiNotes and sends to Anki
    async fn add_notes(&self, notes: Vec<BridgeNote>) -> Result<Vec<usize>, crate::WittCoreError> {
        let params = AddNotesParams { notes };
        let result: serde_json::Value = self.request("addNotes", params).await?;

        let mut note_ids = Vec::new();
        if let Some(results) = result.as_array() {
            for (i, res) in results.iter().enumerate() {
                if res.is_number() {
                    note_ids.push(res.as_u64().unwrap_or(0) as usize);
                } else {
                    log::warn!("Failed to add note {}: {:?}", i, res);
                }
            }
        }

        Ok(note_ids)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_anki_connection() {
        let client = AnkiClient::new();

        match client.is_available().await {
            true => println!("✅ AnkiConnect is available"),
            false => println!("❌ AnkiConnect not available"),
        }
    }
}
