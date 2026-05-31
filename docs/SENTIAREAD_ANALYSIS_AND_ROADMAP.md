# SentiaRead Analysis and Witt Roadmap

This document summarizes observable SentiaRead strengths and maps them to a pragmatic evolution plan for Witt.

The analysis is based on public product material, black-box use of the installed macOS app, and non-invasive inspection of local app metadata and user-owned data files. It does not rely on decompiling or copying proprietary implementation.

## Executive Summary

SentiaRead's advantage is not a single UI trick. It is a coherent learning loop:

1. Put all learning content in one library.
2. Let the learner read or listen with minimal interruption.
3. Turn selection into an immediate context-aware dictionary experience.
4. Store the word, its meaning, and its source context as first-class learning data.
5. Re-surface learning words visually across future reading.
6. Sync progress and learning state across devices.

Witt already has a strong open-source counter-position: local-first EPUB reading, sentence-backed annotations, LLM enrichment, AnkiConnect, TOML configuration, and extensibility. The next product work should preserve this openness while making the default experience feel as immediate and polished as SentiaRead.

## Observed SentiaRead Strengths

### 1. Home Is a Learning Dashboard

The installed app opens to a dashboard, not a raw file list.

Observed UI elements:

- Sidebar sections: Library, Learning, Discover.
- Home, Subscriptions, Annotations, Vocabulary, Books, Podcasts.
- Global search that changes placeholder by section.
- "Today's Reading" progress target.
- "Continue" card for the active book.
- "What's New" area for podcast/feed updates.
- Shelf filters: All, Reading, Finished, Unread.
- Sort/filter control.
- Account, settings, mobile-app, and referral surfaces.

Why it feels good:

- The app tells the user what to do next.
- Reading progress, content discovery, and learning state are visible from the first screen.
- The library is not just storage; it is a habit surface.

Witt gap:

- Witt's bookshelf is functional, but it is still a file shelf. It does not yet act as a learning dashboard.

### 2. Content Sources Are Broader

Public material and app navigation indicate support or intended support for:

- EPUB.
- TXT.
- Markdown.
- Web articles.
- Clipboard import.
- Podcasts.
- Browser extensions.
- Mobile and desktop devices.
- Future PDF and YouTube transcription.

Why it feels good:

- Users can bring in the content they already want to consume.
- The product promise is "learn from preferred input", not "manage EPUB files".

Witt gap:

- Witt is currently centered on EPUB. That is a good first vertical, but it narrows the perceived product.

### 3. Context-Aware Dictionary Is the Primary Interaction

SentiaRead positions AI as a dictionary that understands both text context and learner level.

Observed/public behavior:

- Word-level contextual explanation.
- CEFR-level explanation setting.
- Native-language translation setting.
- Pronunciation accent setting.
- Dictionary cache exists locally.
- Vocabulary entries store contextual explanations and occurrences.

Why it feels good:

- The user does not ask an open-ended AI question each time.
- The default action is immediate comprehension.
- Advanced AI is hidden behind a simple mental model: "explain this word here at my level."

Witt gap:

- Witt currently exposes "Save", "Ask AI", prompts, and Anki actions. This is powerful, but it feels like a tool panel instead of an instant dictionary.

### 4. Vocabulary Is a First-Class Domain

Local database tables observed in SentiaRead:

- `vocabulary`
- `meaning_groups`
- `word_occurrences`
- `translation_cache`
- `reading_progress`
- `library_items`

Important modeling choices:

- A word is not the same thing as an occurrence.
- A meaning group is not the same thing as a word.
- Context, book, chapter, CFI, CEFR level, explanation, and dictionary parameters are preserved.
- Review state fields exist on vocabulary entries.
- Local cache and dirty flags support offline-first or sync-later behavior.

Why it feels good:

- The app can show one clean vocabulary row while still preserving the source contexts behind it.
- Cross-book highlighting and review state can be computed quickly.
- Repeated encounters become a learning asset.

Witt gap:

- Witt has annotations and Anki note cache, but it does not yet have a full internal vocabulary/meaning/occurrence model.

### 5. Visual Memory Reinforcement

SentiaRead highlights learning words across content.

Why it feels good:

- Review happens inside natural reading.
- The learner repeatedly sees words in real contexts.
- Vocabulary learning feels integrated instead of scheduled as a separate task.

Witt gap:

- Witt has known-word highlighting from Anki/cache, but it should evolve into status-aware visual memory: new, learning, mature, ignored, known.

### 6. Settings Are Product-Level, Not Infrastructure-Level

Observed settings:

- Native language.
- Auto translation.
- Interface language.
- CEFR level.
- Pronunciation accent.
- Reader theme.
- Font family.
- Font size.
- Line height.

Why it feels good:

- Settings match learner concerns.
- Technical knobs are hidden.
- The defaults form an opinionated beginner-friendly product.

Witt gap:

- Witt's TOML/API/prompt configurability is a major strength, but the default UI must avoid making users think about endpoints, pipelines, and field mapping before they get value.

### 7. Sync and Account Model Are Deeply Integrated

Local files indicate:

- Supabase auth.
- Active user identity.
- Library sync queue/state.
- Vocabulary sync queue/state.
- Annotation sync queue/state.
- Local SQLite plus sync flags.

Why it feels good:

- The app can work locally and reconcile later.
- Multi-device use is part of the product promise.

Witt gap:

- Witt should remain local-first, but it needs a clear sync story. Anki can be the default vocabulary/review backend before Witt attempts its own cloud.

## Anki as Witt's Vocabulary Backend

Witt should support Anki as the default vocabulary backend, but the reader should not directly depend on live AnkiConnect queries.

Recommended architecture:

```text
Anki
  default source of truth for review state and long-term memory

Witt local cache
  fast reading-time lookup, highlighting, contextual dictionary cache, occurrence index
```

Recommended modes:

- **Anki-first**: selected Anki deck/model is the authoritative vocabulary source. Witt imports and indexes it.
- **Witt-first**: selected words start in Witt, then are pushed to Anki.
- **Hybrid default**: Anki known/learning words are pulled into Witt; new reading selections are captured locally and later synced to Anki.

The hybrid mode should be the default because it preserves reading flow even when Anki is closed.

Minimum local tables:

```text
vocabulary
  word, normalized_word, status, source, anki_note_id, deck_name, model_name,
  fields_json, phonetic, phonetics_json, review_json, is_dirty, last_synced_at

meaning_groups
  id, word, part_of_speech, short_definition, translated_definition,
  cefr_level, source, created_at, updated_at

word_occurrences
  id, word, meaning_group_id, book_id, chapter, cfi, sentence,
  selected_text, explanation, created_at

dictionary_cache
  cache_key, word, sentence_hash, cefr_level, native_language,
  provider, model, response_json, created_at, last_accessed_at
```

Anki field mapping should remain configurable, but the app should ship with a first-run preset:

- Word field.
- Sentence/context field.
- Meaning field.
- Source/book field.
- Extra/AI explanation field.
- Pronunciation/audio field, optional.

## Product Principles for Witt

1. Keep the open core: local data, custom API, prompt/pipeline configuration, Anki integration, exportability.
2. Make the default path non-technical.
3. Treat Anki as a backend, not as the whole product model.
4. Make context the atomic unit of learning.
5. Make vocabulary status visible inside reading.
6. Use cache aggressively so reading never waits on repeated AI calls.
7. Prefer small polished interactions over broad feature count.

## Roadmap

### Phase 1: SentiaRead-Level EPUB Core

Goal: Make reading, selection, explanation, and saving feel immediate.

Work:

- Replace the current selection toolbar default with a dictionary card.
- Show word, part of speech, CEFR, short English explanation, native-language gloss, and source sentence.
- Keep Save, Ask AI, Anki, prompt, and advanced actions secondary.
- Cache explanations by word + sentence + CEFR + native language + provider settings.
- Add click/hover behavior for already-highlighted vocabulary.
- Add loading, cached, failed, and retry states that do not block reading.
- Add keyboard and pointer polish: escape closes, reselect updates, popup stays within viewport.

Success criteria:

- Selecting an unknown word usually produces a useful explanation with one action or less.
- Existing cached words open instantly.
- The user can keep reading without understanding prompts or pipelines.

### Phase 2: Vocabulary Domain Model

Goal: Build the local model needed for visual memory, Anki backend, and contextual review.

Work:

- Add `vocabulary`, `meaning_groups`, `word_occurrences`, and `dictionary_cache`. Initial tables and command wrappers are in place; later work should deepen meaning-level and review-state data.
- Migrate existing annotations into occurrences where possible. Startup schema migration now backfills vocabulary and occurrence rows from existing annotations.
- Keep existing annotations/Anki behavior working during migration.
- Implement vocabulary status: new, learning, known, ignored.
- Add indexes for normalized word lookup and book-level occurrence lookup.
- Add import/update flow from AnkiConnect into the local vocabulary cache. `refresh_anki_cache` now indexes pulled deck words into `vocabulary`.

Success criteria:

- Reader highlighting does not require live AnkiConnect.
- Vocabulary page can list words independent of annotations.
- A word can have multiple occurrences and meanings.

### Phase 3: Anki-First Backend

Goal: Make Anki a serious backend, not just a sync target.

Work:

- Add backend mode setting: Hybrid, Anki-first, Witt-first.
- Add selected deck/model mapping wizard.
- Pull Anki notes into local vocabulary cache. The first slice indexes deck words locally; deck/model/raw-field provenance still needs to be promoted into the vocabulary layer.
- Track `anki_note_id`, deck, model, and raw fields.
- Push new local words to Anki using configurable templates.
- Add conflict handling: Anki changed, Witt changed, duplicate word, duplicate sentence.
- Add export path for users who do not want AnkiConnect running.

Success criteria:

- A user can point Witt at an existing Anki deck and immediately get known/learning word highlights.
- New words selected in Witt can become Anki notes without breaking reading flow.

### Phase 4: Visual Memory

Goal: Make vocabulary review happen naturally while reading.

Work:

- Highlight words by status with restrained visual styles.
- Show inline mini-gloss for learning words as an optional mode.
- Add "View contexts" from vocabulary entries.
- Add occurrence count and last-seen metadata.
- Add per-book and all-library visual memory settings.
- Add ignore/known quick actions from the popup.

Success criteria:

- A learner can recognize which words are new, learning, or known while reading.
- Repeated encounters are visible and searchable.

### Phase 5: Learning Dashboard

Goal: Move the app from bookshelf to learning workspace.

Work:

- Redesign Home around Continue Reading, recent books, today's reading, vocabulary progress, and sync status.
- Add library filters: All, Reading, Finished, Unread.
- Add global search with scoped placeholders.
- Add Annotations and Vocabulary as first-class navigation items.
- Add import menu for EPUB, TXT, Markdown, clipboard, and later web article.

Success criteria:

- The first screen tells the user what to do next.
- Books, annotations, and vocabulary feel like one product.

### Phase 6: Broader Content Inputs

Goal: Expand content without diluting the EPUB reading core.

Recommended order:

1. TXT.
2. Markdown.
3. Clipboard article.
4. URL/article import.
5. Browser extension.
6. Podcast.
7. PDF.
8. YouTube transcription.

Rationale:

- TXT/Markdown/clipboard reuse most of the reader and vocabulary pipeline.
- Web import needs parsing and cleanup.
- Podcast/PDF/video require separate media and transcription subsystems.

### Phase 7: Optional Sync Layer

Goal: Preserve local-first openness while allowing multi-device workflows.

Work:

- First support file-based export/import and backup.
- Then support user-chosen sync folders.
- Later consider a hosted sync service.
- Keep Anki as a first-class external backend.

Success criteria:

- Users can move data without lock-in.
- The open-source version remains valuable without cloud accounts.

## UI Direction

Witt should not copy SentiaRead's visuals, but it should learn from its hierarchy.

Recommended style:

- Calm, text-first interface.
- Sidebar navigation for product areas.
- Large readable headings with minimal ornament.
- Strong typography in the reader.
- Floating dictionary card with clear information hierarchy.
- Fewer exposed technical controls in the main flow.
- Advanced configuration remains available in Settings and TOML.

The most important UI investment is the dictionary card. It is the moment where the product either feels magical or mechanical.

## Near-Term Implementation Slice

The best next implementation slice is:

1. Add local vocabulary/cache tables.
2. Add Anki-backed vocabulary import into the cache.
3. Replace the selection popup's default state with a dictionary card.
4. Use cached Anki/local vocabulary first, then AI explanation if missing.
5. Add status-aware highlights in the EPUB iframe.

This slice directly improves the reading experience while preserving Witt's open architecture.

## Non-Goals

For now, avoid:

- Building cloud sync before the local vocabulary model is stable.
- Building podcast/PDF/video before EPUB selection feels excellent.
- Exposing prompt/pipeline complexity in the default reading popup.
- Binding the whole app directly to Anki's note model.
- Copying proprietary UI assets or implementation details.

## Final Positioning

SentiaRead is polished because it makes the learner's default path simple and cohesive. Witt can compete by reaching similar default ergonomics while being more open:

- Bring your own API.
- Use Anki as backend.
- Export your data.
- Inspect and customize prompts.
- Extend content and sync workflows.
- Keep local-first ownership.

The goal is not an open-source clone. The goal is an open, extensible language reading system whose default experience is as smooth as the best closed products.
