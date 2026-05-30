use crate::models::{AnkiNote, Annotation, AppSettings};
use chrono::Utc;
use serde_json::{json, Value};

pub async fn prepare_note(
    settings: &AppSettings,
    api_key: Option<&str>,
    deck_name: &str,
    annotation: &Annotation,
) -> Value {
    let values = preprocess_fields(settings, api_key, annotation).await;
    build_note(settings, deck_name, values)
}

pub fn parse_notes(deck_name: &str, values: Vec<Value>) -> Vec<AnkiNote> {
    let now = Utc::now().to_rfc3339();
    values
        .into_iter()
        .filter_map(|note| parse_note(deck_name, &now, note))
        .collect()
}

pub fn default_model_payload(model_name: &str) -> Value {
    json!({
        "modelName": model_name,
        "inOrderFields": ["Word", "Sentence", "Book", "Chapter", "Meaning"],
        "css": ".card{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;font-size:20px;line-height:1.6}.word{font-size:32px;font-weight:700}.sentence{margin-top:18px}.meaning{margin-top:18px;color:#475569}",
        "cardTemplates": [{
            "Name": "Sentence",
            "Front": "<div class=\"word\">{{Word}}</div><div class=\"sentence\">{{Sentence}}</div>",
            "Back": "<div class=\"word\">{{Word}}</div><div class=\"sentence\">{{Sentence}}</div><div class=\"meaning\">{{Meaning}}</div><p>{{Book}} · {{Chapter}}</p>"
        }]
    })
}

async fn preprocess_fields(
    settings: &AppSettings,
    api_key: Option<&str>,
    annotation: &Annotation,
) -> Value {
    if settings.anki_preprocess_mode == "llm" {
        if let Some(key) = api_key {
            if let Ok(value) = crate::llm::preprocess_annotation(settings, key, annotation).await {
                return value;
            }
        }
    }
    apply_template(settings, annotation)
}

fn build_note(settings: &AppSettings, deck_name: &str, values: Value) -> Value {
    let mut fields = serde_json::Map::new();
    insert_field(
        &mut fields,
        &settings.anki_word_field,
        value_at(&values, "word"),
    );
    insert_field(
        &mut fields,
        &settings.anki_sentence_field,
        value_at(&values, "sentence"),
    );
    insert_field(
        &mut fields,
        &settings.anki_book_field,
        value_at(&values, "book"),
    );
    insert_field(
        &mut fields,
        &settings.anki_chapter_field,
        value_at(&values, "chapter"),
    );
    insert_field(
        &mut fields,
        &settings.anki_meaning_field,
        value_at(&values, "meaning"),
    );
    json!({
        "deckName": deck_name,
        "modelName": settings.anki_model_name,
        "fields": fields,
        "tags": ["witt", "epub"],
        "options": { "allowDuplicate": false, "duplicateScope": "deck" }
    })
}

fn insert_field(fields: &mut serde_json::Map<String, Value>, field_name: &str, value: String) {
    if !field_name.trim().is_empty() {
        fields.insert(field_name.to_string(), json!(value));
    }
}

fn value_at(value: &Value, key: &str) -> String {
    value
        .get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string()
}

fn apply_template(settings: &AppSettings, annotation: &Annotation) -> Value {
    let template = serde_json::from_str::<Value>(&settings.anki_preprocess_template)
        .unwrap_or_else(|_| {
            serde_json::from_str(&crate::llm::default_preprocess_template())
                .unwrap_or_else(|_| json!({}))
        });
    let mut output = serde_json::Map::new();
    for key in ["word", "sentence", "book", "chapter", "meaning"] {
        let raw = template
            .get(key)
            .and_then(Value::as_str)
            .unwrap_or_default();
        output.insert(
            key.to_string(),
            json!(replace_placeholders(raw, annotation)),
        );
    }
    Value::Object(output)
}

fn replace_placeholders(template: &str, annotation: &Annotation) -> String {
    template
        .replace("{{id}}", &annotation.id)
        .replace("{{word}}", &annotation.word)
        .replace("{{sentence}}", &annotation.sentence)
        .replace("{{book_id}}", &annotation.book_id)
        .replace(
            "{{chapter}}",
            annotation.chapter_title.as_deref().unwrap_or_default(),
        )
        .replace(
            "{{epub_cfi}}",
            annotation.epub_cfi.as_deref().unwrap_or_default(),
        )
}

fn parse_note(deck_name: &str, now: &str, value: Value) -> Option<AnkiNote> {
    let note_id = value.get("noteId")?.as_i64()?;
    let fields = value.get("fields")?.as_object()?;
    let field_value = |name: &str| -> Option<String> {
        fields
            .get(name)
            .and_then(|field| field.get("value"))
            .and_then(|value| value.as_str())
            .map(strip_html)
            .filter(|value| !value.trim().is_empty())
    };

    let word = field_value("Word")
        .or_else(|| field_value("Lemma"))
        .or_else(|| field_value("Front"))
        .or_else(|| {
            fields.values().find_map(|field| {
                field
                    .get("value")
                    .and_then(|v| v.as_str())
                    .map(strip_html)
                    .filter(|s| !s.trim().is_empty())
            })
        })?;
    Some(AnkiNote {
        note_id,
        deck_name: deck_name.to_string(),
        word: word.to_lowercase(),
        sentence: field_value("Sentence"),
        meaning: field_value("Meaning")
            .or_else(|| field_value("Definition"))
            .or_else(|| field_value("Back")),
        raw_fields_json: serde_json::to_string(&fields).ok()?,
        updated_at: now.to_string(),
    })
}

fn strip_html(value: &str) -> String {
    let mut output = String::new();
    let mut in_tag = false;
    for ch in value.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => output.push(ch),
            _ => {}
        }
    }
    output.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::strip_html;

    #[test]
    fn strips_basic_html() {
        assert_eq!(strip_html("<b>Hello</b>"), "Hello");
    }
}
