# TOML Configuration

Witt keeps human-maintained configuration in one `settings.toml` file in the app data directory. Open it from Settings with `Open`, or from the Anki Sync Configuration `TOML` button, edit it in your configured editor, then use `Reload` to load external edits back into the app.

The LLM API key is not stored in TOML. It stays in the OS keyring.

## Shape

```toml
config_version = 1

[settings]
llm_prompt_id = "explain"
anki_pipeline_id = "default"
selection_auto_ask_ai = false
vocabulary_backend_mode = "hybrid"
visual_memory_scope = "library"
inline_mini_gloss = false

[llm]
endpoint = "https://api.openai.com/v1/chat/completions"
default_model = "gpt-4.1-mini"

[anki]
endpoint = "http://localhost:8765"
note_type_name = "Witt EPUB Sentence"

[anki.fields]
word = "Word"
sentence = "Sentence"
book = "Book"
chapter = "Chapter"
meaning = "Meaning"

[editor]
command = "code"
args = ["-r"]

[prompts.explain]
name = "Explain in context"
model = "gpt-4.1-mini"
prompt = """
Explain the selected text in context.
"""

[pipelines.default]
name = "Default Anki fields"
mode = "template"
prompt = """
Transform the reading capture into Anki-ready fields.
"""

[pipelines.default.template]
word = "{{word}}"
sentence = "{{sentence}}"
book = "{{book_id}}"
chapter = "{{chapter}}"
meaning = ""
```

## Sections

`config_version` is the config schema version. The current value is `1`.

`[settings]` only stores current selections and behavior toggles:

- `llm_prompt_id` points to `[prompts.<id>]`.
- `anki_pipeline_id` points to `[pipelines.<id>]`.
- `selection_auto_ask_ai` controls whether selection automatically calls Ask AI.
- `vocabulary_backend_mode` is `hybrid`, `anki_first`, or `witt_first`.
- `visual_memory_scope` is `library` for all indexed words or `book` for current-book occurrences only.
- `inline_mini_gloss` shows cached word meanings inline while reading.

`[llm]` stores LLM connection defaults. `default_model` is used unless the selected prompt has its own `model`.

`[anki]` stores AnkiConnect connection and note type settings. `note_type_name` maps to Anki's note type/model name.

`[anki.fields]` maps Witt fields to Anki note fields.

`[editor]` controls which editor opens this same file. The default is VS Code:

```toml
[editor]
command = "code"
args = ["-r"]
```

Use `command = "cursor"` or `command = "zed"` if those commands are installed.

`[prompts.<id>]` defines Ask AI prompt profiles. `model` is optional. If present, it overrides `[llm].default_model` for that prompt. The app trims leading and trailing whitespace from prompt text after loading.

`[pipelines.<id>]` defines Anki preprocessing profiles. `mode = "template"` uses `[pipelines.<id>.template]`; `mode = "llm"` uses the pipeline `prompt` to ask the LLM for Anki fields.

Supported template placeholders:

| Placeholder | Value |
|---|---|
| `{{id}}` | Annotation id |
| `{{word}}` | Saved word |
| `{{sentence}}` | Surrounding sentence |
| `{{book_id}}` | Witt book id |
| `{{chapter}}` | EPUB chapter title |
| `{{epub_cfi}}` | EPUB CFI |

## What Stays In SQLite

Books, reading progress, saved annotations, selected Anki deck, cached Anki notes, local vocabulary, word occurrences, and dictionary cache stay in SQLite. The TOML file is for configuration you may want to edit by hand.
