# Product

## Core Promise

Witt turns EPUB reading into sentence-backed Anki cards with minimal interruption to reading.

## Required Capabilities

1. **Reading workspace** — Import EPUB files; books persist across sessions with cover, title, author, and a lightweight continue-reading dashboard.
2. **Reader** — Clean paginated view with font size, line height, and theme controls; reading position restored on reopen.
3. **Annotation** — Select a word while reading; Witt stores the word and the full sentence it appeared in, with CFI location and chapter.
4. **LLM enrichment** — Generate card backs for annotations awaiting sync; batched at up to 20 per request.
5. **Anki sync** — Push annotations to AnkiConnect as `Witt EPUB Sentence` notes; track sync status per annotation.
6. **Known-word highlighting** — Pull the selected Anki deck into a local cache; highlight cached words in the reader.

## Scope Boundaries

The following are not part of this product:

- Capture inboxes or broad content management beyond the local reading workspace
- Video or audio workflows
- Cloud sync or multi-device support

Future adjacent workflows should be introduced through the extension registry in `ui/src/lib/extensions.ts`, not as additions to the reader or bookshelf.

## Settings

| Setting                                                                                                                          | Storage                                               |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| LLM API key                                                                                                                      | OS keyring                                            |
| Human-maintained config: endpoint, model, profile choices, Anki mapping, behavior toggles, editor preference, prompts, pipelines | Single `settings.toml` file in the app data directory |
| Active Anki deck                                                                                                                 | SQLite `anki_decks` table                             |

## UI Direction

- The first screen is a calm reading workspace: continue reading, library status, import, and bookshelf.
- Reader controls should stay quiet and secondary to the text. Page turns primarily use keyboard and edge zones.
- Selection UI should behave like a contextual word card first, with Save, Ask AI, prompts, and custom questions as secondary actions.
- Advanced TOML, API, and pipeline controls remain available, but default labels should speak to learner goals rather than infrastructure.

## Anki Integration

- Anki must be running with [AnkiConnect](https://ankiweb.net/shared/info/2055492159) enabled.
- Witt connects to `http://localhost:8765`.
- The `Witt EPUB Sentence` note type is created automatically if it does not exist.
- Only the selected deck is cached; refresh is triggered manually.
