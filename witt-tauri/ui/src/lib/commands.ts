import { invoke } from '@tauri-apps/api/core';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export interface BookRecord {
  id: string;
  title: string;
  author: string;
  file_path: string;
  cover_path?: string | null;
  imported_at: string;
  updated_at: string;
}

export interface ReadingProgress {
  book_id: string;
  epub_cfi: string;
  chapter_href?: string | null;
  progress_percent: number;
  updated_at: string;
}

export interface Annotation {
  id: string;
  book_id: string;
  word: string;
  sentence: string;
  chapter_title?: string | null;
  epub_cfi?: string | null;
  status: string;
  anki_note_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AnnotationDraft {
  book_id: string;
  word: string;
  sentence: string;
  chapter_title?: string | null;
  epub_cfi?: string | null;
}

export interface AnnotationUpdate {
  id: string;
  word: string;
  sentence: string;
  chapter_title?: string | null;
}

export interface AnkiDeck {
  name: string;
  selected: boolean;
  synced_at?: string | null;
}

export interface AnkiModelInfo {
  name: string;
  fields: string[];
}

export interface AnkiNote {
  note_id: number;
  deck_name: string;
  word: string;
  sentence?: string | null;
  meaning?: string | null;
  raw_fields_json: string;
  updated_at: string;
}

export interface AppSettings {
  llm_endpoint: string;
  llm_model: string;
  llm_prompt_id: string;
  anki_endpoint: string;
  anki_model_name: string;
  anki_word_field: string;
  anki_sentence_field: string;
  anki_book_field: string;
  anki_chapter_field: string;
  anki_meaning_field: string;
  anki_preprocess_mode: string;
  anki_pipeline_id: string;
  anki_preprocess_template: string;
  anki_preprocess_prompt: string;
  selection_auto_ask_ai: boolean;
}

export interface SelectionLlmRequest {
  selected_text: string;
  word: string;
  sentence: string;
  chapter_title?: string | null;
  question: string;
  prompt_id?: string | null;
}

export interface PromptProfile {
  id: string;
  name: string;
  model?: string | null;
  prompt: string;
  path: string;
}

export interface PipelineProfile {
  id: string;
  name: string;
  mode: string;
  path: string;
}

export interface PipelineConfig {
  name: string;
  mode: string;
  prompt: string;
  template: Record<string, string>;
}

export interface ConfigSettings {
  llm_prompt_id: string;
  anki_pipeline_id: string;
  selection_auto_ask_ai: boolean;
}

export interface LlmConfig {
  endpoint: string;
  default_model: string;
}

export interface AnkiFieldsConfig {
  word: string;
  sentence: string;
  book: string;
  chapter: string;
  meaning: string;
}

export interface AnkiConfig {
  endpoint: string;
  note_type_name: string;
  fields: AnkiFieldsConfig;
}

export interface EditorConfig {
  command: string;
  args: string[];
}

export interface AppConfig {
  config_version: number;
  settings: ConfigSettings;
  llm: LlmConfig;
  anki: AnkiConfig;
  editor: EditorConfig;
  prompts: Record<string, Omit<PromptProfile, 'id' | 'path'>>;
  pipelines: Record<string, PipelineConfig>;
}

export interface AnkiStatus {
  available: boolean;
  version?: number | null;
}

export interface SyncSummary {
  created: number;
  failed: Array<{ word: string; error: string }>;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  llm_endpoint: 'https://api.openai.com/v1/chat/completions',
  llm_model: 'gpt-4.1-mini',
  llm_prompt_id: 'explain',
  anki_endpoint: 'http://localhost:8765',
  anki_model_name: 'Witt EPUB Sentence',
  anki_word_field: 'Word',
  anki_sentence_field: 'Sentence',
  anki_book_field: 'Book',
  anki_chapter_field: 'Chapter',
  anki_meaning_field: 'Meaning',
  anki_preprocess_mode: 'template',
  anki_pipeline_id: 'default',
  anki_preprocess_template:
    '{"word":"{{word}}","sentence":"{{sentence}}","book":"{{book_id}}","chapter":"{{chapter}}","meaning":""}',
  anki_preprocess_prompt:
    'Transform the reading capture into Anki-ready fields. Return strict JSON only: {"word":"...","sentence":"...","book":"...","chapter":"...","meaning":"..."}.',
  selection_auto_ask_ai: false,
};

export function hasTauriRuntime() {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
}

function unavailableInBrowser(commandName: string): Promise<never> {
  return Promise.reject(new Error(`${commandName} requires the Tauri desktop runtime`));
}

function command<T>(
  commandName: string,
  args?: Record<string, unknown>,
  browserFallback?: () => T
): Promise<T> {
  if (!hasTauriRuntime()) {
    return browserFallback ? Promise.resolve(browserFallback()) : unavailableInBrowser(commandName);
  }
  return invoke<T>(commandName, args);
}

export function importBook(sourcePath: string): Promise<BookRecord> {
  return command<BookRecord>('import_book', { sourcePath });
}

export function listBooks(): Promise<BookRecord[]> {
  return command<BookRecord[]>('list_books', undefined, () => []);
}

export function getBook(bookId: string): Promise<BookRecord | null> {
  return command<BookRecord | null>('get_book', { bookId }, () => null);
}

export function openReaderWindow(bookId: string): Promise<void> {
  return command<void>('open_reader_window', { bookId });
}

export function removeBook(bookId: string): Promise<void> {
  return command<void>('remove_book', { bookId });
}

export function getBookFile(bookId: string): Promise<number[]> {
  return command<number[]>('get_book_file', { bookId });
}

export function saveProgress(progress: ReadingProgress): Promise<void> {
  return command<void>('save_progress', { progress });
}

export function getProgress(bookId: string): Promise<ReadingProgress | null> {
  return command<ReadingProgress | null>('get_progress', { bookId }, () => null);
}

export function createAnnotation(draft: AnnotationDraft): Promise<Annotation> {
  return command<Annotation>('create_annotation', { draft });
}

export function updateAnnotation(update: AnnotationUpdate): Promise<Annotation> {
  return command<Annotation>('update_annotation', { update });
}

export function listAnnotations(bookId?: string): Promise<Annotation[]> {
  return command<Annotation[]>('list_annotations', { bookId: bookId ?? null }, () => []);
}

export function deleteQueuedAnnotation(annotationId: string): Promise<void> {
  return command<void>('delete_queued_annotation', { annotationId });
}

export function syncAnnotationsToAnki(): Promise<SyncSummary> {
  return command<SyncSummary>('sync_annotations_to_anki');
}

export function checkAnki(): Promise<AnkiStatus> {
  return command<AnkiStatus>('check_anki', undefined, () => ({ available: false, version: null }));
}

export function listAnkiDecks(): Promise<AnkiDeck[]> {
  return command<AnkiDeck[]>('list_anki_decks', undefined, () => []);
}

export function listAnkiModels(): Promise<AnkiModelInfo[]> {
  return command<AnkiModelInfo[]>('list_anki_models', undefined, () => []);
}

export function selectAnkiDeck(deckName: string): Promise<void> {
  return command<void>('select_anki_deck', { deckName });
}

export function refreshAnkiCache(deckName: string): Promise<AnkiNote[]> {
  return command<AnkiNote[]>('refresh_anki_cache', { deckName });
}

export function searchAnkiNotes(deckName?: string, query?: string): Promise<AnkiNote[]> {
  return command<AnkiNote[]>(
    'search_anki_notes',
    {
      deckName: deckName ?? null,
      query: query ?? null,
    },
    () => []
  );
}

export function getAnkiNote(noteId: number): Promise<AnkiNote | null> {
  return command<AnkiNote | null>('get_anki_note', { noteId }, () => null);
}

export function askLlmAboutSelection(request: SelectionLlmRequest): Promise<string> {
  return command<string>('ask_llm_about_selection', { request });
}

export function listPromptProfiles(): Promise<PromptProfile[]> {
  return command<PromptProfile[]>('list_prompt_profiles', undefined, () => []);
}

export function listPipelineProfiles(): Promise<PipelineProfile[]> {
  return command<PipelineProfile[]>('list_pipeline_profiles', undefined, () => []);
}

export function openPromptProfile(promptId: string): Promise<string> {
  return command<string>('open_prompt_profile', { promptId });
}

export function openPipelineProfile(pipelineId: string): Promise<string> {
  return command<string>('open_pipeline_profile', { pipelineId });
}

export function readPromptProfile(promptId: string): Promise<string> {
  return command<string>('read_prompt_profile', { promptId });
}

export function savePromptProfile(promptId: string, content: string): Promise<void> {
  return command<void>('save_prompt_profile', { promptId, content });
}

export function readPipelineProfile(pipelineId: string): Promise<string> {
  return command<string>('read_pipeline_profile', { pipelineId });
}

export function savePipelineProfile(pipelineId: string, content: string): Promise<void> {
  return command<void>('save_pipeline_profile', { pipelineId, content });
}

export function loadPipelineProfile(pipelineId: string): Promise<AppSettings> {
  return command<AppSettings>('load_pipeline_profile', { pipelineId }, () => DEFAULT_APP_SETTINGS);
}

export function getSettings(): Promise<AppSettings> {
  return command<AppSettings>('get_settings', undefined, () => DEFAULT_APP_SETTINGS);
}

export function saveSettings(settings: AppSettings): Promise<void> {
  return command<void>('save_settings', { settings });
}

export function saveLlmApiKey(apiKey: string): Promise<void> {
  return command<void>('save_llm_api_key', { apiKey });
}

export function hasLlmApiKey(): Promise<boolean> {
  return command<boolean>('has_llm_api_key', undefined, () => false);
}

export function openAppConfig(): Promise<string> {
  return command<string>('open_app_config');
}

export function reloadAppConfig(): Promise<AppSettings> {
  return command<AppSettings>('reload_app_config', undefined, () => DEFAULT_APP_SETTINGS);
}

export function getAppConfig(): Promise<AppConfig> {
  return command<AppConfig>('get_app_config', undefined, () => ({
    config_version: 1,
    settings: {
      llm_prompt_id: DEFAULT_APP_SETTINGS.llm_prompt_id,
      anki_pipeline_id: DEFAULT_APP_SETTINGS.anki_pipeline_id,
      selection_auto_ask_ai: DEFAULT_APP_SETTINGS.selection_auto_ask_ai,
    },
    llm: {
      endpoint: DEFAULT_APP_SETTINGS.llm_endpoint,
      default_model: DEFAULT_APP_SETTINGS.llm_model,
    },
    anki: {
      endpoint: DEFAULT_APP_SETTINGS.anki_endpoint,
      note_type_name: DEFAULT_APP_SETTINGS.anki_model_name,
      fields: {
        word: DEFAULT_APP_SETTINGS.anki_word_field,
        sentence: DEFAULT_APP_SETTINGS.anki_sentence_field,
        book: DEFAULT_APP_SETTINGS.anki_book_field,
        chapter: DEFAULT_APP_SETTINGS.anki_chapter_field,
        meaning: DEFAULT_APP_SETTINGS.anki_meaning_field,
      },
    },
    editor: { command: 'code', args: ['-r'] },
    prompts: {},
    pipelines: {},
  }));
}

export function saveAppConfig(config: AppConfig): Promise<AppConfig> {
  return command<AppConfig>('save_app_config', { config });
}
