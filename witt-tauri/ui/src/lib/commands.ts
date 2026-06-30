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

export interface VocabularyEntry {
  normalized_word: string;
  display_word: string;
  status: 'new' | 'learning' | 'known' | 'ignored';
  source: string;
  anki_note_id?: number | null;
  deck_name?: string | null;
  model_name?: string | null;
  raw_fields_json?: string | null;
  cached_meaning?: string | null;
  occurrence_count: number;
  last_seen_at?: string | null;
  first_seen_at: string;
  updated_at: string;
}

export interface WordOccurrence {
  id: string;
  normalized_word: string;
  book_id?: string | null;
  annotation_id?: string | null;
  sentence: string;
  chapter_title?: string | null;
  epub_cfi?: string | null;
  created_at: string;
}

export interface MeaningGroup {
  id: string;
  normalized_word: string;
  meaning: string;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface DictionaryCacheEntry {
  normalized_word: string;
  display_word: string;
  meaning: string;
  prompt_id?: string | null;
  updated_at: string;
}

export interface DictionaryCacheDraft {
  word: string;
  meaning: string;
  prompt_id?: string | null;
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
  vocabulary_backend_mode: 'hybrid' | 'anki_first' | 'witt_first';
  visual_memory_scope: 'library' | 'book';
  inline_mini_gloss: boolean;
  anki_auto_sync_web: boolean;
  web_mode_enabled: boolean;
  web_queue_endpoint: string;
  web_queue_token: string;
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
  vocabulary_backend_mode: 'hybrid' | 'anki_first' | 'witt_first';
  visual_memory_scope: 'library' | 'book';
  inline_mini_gloss: boolean;
  anki_auto_sync_web: boolean;
  web_mode_enabled: boolean;
  web_queue_endpoint: string;
  web_queue_token: string;
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
  anki_web_sync: 'not_requested' | 'synced' | 'failed';
  anki_web_sync_error?: string | null;
}

export interface AnkiSyncConflict {
  annotation_id: string;
  word: string;
  sentence: string;
  kind: string;
  detail: string;
  anki_note_id?: number | null;
}

export interface ExportSummary {
  path: string;
  exported: number;
}

export interface WebQueueAnnotationJob {
  id: string;
  deck_name: string;
  annotation: Annotation;
  settings?: AppSettings | null;
}

export interface WebQueueJobResult {
  id: string;
  summary: SyncSummary;
}

export interface WebQueueProcessSummary {
  claimed: number;
  completed: number;
  failed: number;
  results: WebQueueJobResult[];
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
  vocabulary_backend_mode: 'hybrid',
  visual_memory_scope: 'library',
  inline_mini_gloss: false,
  anki_auto_sync_web: true,
  web_mode_enabled: false,
  web_queue_endpoint: '',
  web_queue_token: '',
};

export function hasTauriRuntime() {
  return typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;
}

function apiUrl(path: string) {
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  const base = meta.env?.VITE_WITT_API_BASE_URL || '';
  return `${base}${path}`;
}

function webToken() {
  if (typeof window === 'undefined') {
    return '';
  }
  const fromQuery = new URLSearchParams(window.location.search).get('token');
  if (fromQuery) {
    window.localStorage.setItem('witt.webToken', fromQuery);
    return fromQuery;
  }
  const stored = window.localStorage.getItem('witt.webToken');
  if (stored) {
    return stored;
  }
  const entered = window.prompt('Enter Witt web token')?.trim() ?? '';
  if (entered) {
    window.localStorage.setItem('witt.webToken', entered);
  }
  return entered;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const body = init.body;
  if (body && !(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = webToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(apiUrl(path), { ...init, headers });
  if (response.status === 204) {
    return undefined as T;
  }
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error || message;
    } catch {
      // Keep status text fallback.
    }
    if (response.status === 401 && typeof window !== 'undefined') {
      window.localStorage.removeItem('witt.webToken');
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

async function apiBytes(path: string): Promise<number[]> {
  const headers = new Headers();
  const token = webToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(apiUrl(path), { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return Array.from(new Uint8Array(await response.arrayBuffer()));
}

async function apiText(path: string, init: RequestInit = {}): Promise<string> {
  const headers = new Headers(init.headers);
  const token = webToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(apiUrl(path), { ...init, headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
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

export function importBook(sourcePath: string | File): Promise<BookRecord> {
  if (!hasTauriRuntime()) {
    if (!(sourcePath instanceof File)) {
      return unavailableInBrowser('import_book');
    }
    const form = new FormData();
    form.append('file', sourcePath);
    return api<BookRecord>('/api/books', { method: 'POST', body: form });
  }
  return command<BookRecord>('import_book', { sourcePath });
}

export function listBooks(): Promise<BookRecord[]> {
  return hasTauriRuntime() ? command<BookRecord[]>('list_books') : api<BookRecord[]>('/api/books');
}

export function getBook(bookId: string): Promise<BookRecord | null> {
  return hasTauriRuntime()
    ? command<BookRecord | null>('get_book', { bookId })
    : api<BookRecord>(`/api/books/${encodeURIComponent(bookId)}`).catch((error) => {
        if (error instanceof Error && error.message === 'Book not found') {
          return null;
        }
        throw error;
      });
}

export function openReaderWindow(bookId: string): Promise<void> {
  if (!hasTauriRuntime()) {
    window.location.href = `/?reader=${encodeURIComponent(bookId)}`;
    return Promise.resolve();
  }
  return command<void>('open_reader_window', { bookId });
}

export function removeBook(bookId: string): Promise<void> {
  return hasTauriRuntime()
    ? command<void>('remove_book', { bookId })
    : api<void>(`/api/books/${encodeURIComponent(bookId)}`, { method: 'DELETE' });
}

export function getBookFile(bookId: string): Promise<number[]> {
  return hasTauriRuntime()
    ? command<number[]>('get_book_file', { bookId })
    : apiBytes(`/api/books/${encodeURIComponent(bookId)}/file`);
}

export function saveProgress(progress: ReadingProgress): Promise<void> {
  return hasTauriRuntime()
    ? command<void>('save_progress', { progress })
    : api<void>(`/api/books/${encodeURIComponent(progress.book_id)}/progress`, {
        method: 'PUT',
        body: JSON.stringify(progress),
      });
}

export function getProgress(bookId: string): Promise<ReadingProgress | null> {
  return hasTauriRuntime()
    ? command<ReadingProgress | null>('get_progress', { bookId })
    : api<ReadingProgress | null>(`/api/books/${encodeURIComponent(bookId)}/progress`);
}

export function createAnnotation(draft: AnnotationDraft): Promise<Annotation> {
  return hasTauriRuntime()
    ? command<Annotation>('create_annotation', { draft })
    : api<Annotation>('/api/annotations', { method: 'POST', body: JSON.stringify(draft) });
}

export function updateAnnotation(update: AnnotationUpdate): Promise<Annotation> {
  return hasTauriRuntime()
    ? command<Annotation>('update_annotation', { update })
    : api<Annotation>(`/api/annotations/${encodeURIComponent(update.id)}`, {
        method: 'PUT',
        body: JSON.stringify(update),
      });
}

export function listAnnotations(bookId?: string): Promise<Annotation[]> {
  if (hasTauriRuntime()) {
    return command<Annotation[]>('list_annotations', { bookId: bookId ?? null });
  }
  const query = bookId ? `?book_id=${encodeURIComponent(bookId)}` : '';
  return api<Annotation[]>(`/api/annotations${query}`);
}

export function deleteQueuedAnnotation(annotationId: string): Promise<void> {
  return hasTauriRuntime()
    ? command<void>('delete_queued_annotation', { annotationId })
    : api<void>(`/api/annotations/${encodeURIComponent(annotationId)}`, { method: 'DELETE' });
}

export function syncAnnotationsToAnki(): Promise<SyncSummary> {
  return hasTauriRuntime()
    ? command<SyncSummary>('sync_annotations_to_anki')
    : api<SyncSummary>('/api/anki/sync', { method: 'POST' });
}

export function syncAnkiWeb(): Promise<SyncSummary> {
  return hasTauriRuntime()
    ? command<SyncSummary>('sync_anki_web')
    : api<SyncSummary>('/api/anki/sync-web', { method: 'POST' });
}

export function processWebModeQueue(limit?: number): Promise<WebQueueProcessSummary> {
  return command<WebQueueProcessSummary>('process_web_mode_queue', { limit: limit ?? null });
}

export function listAnkiSyncConflicts(): Promise<AnkiSyncConflict[]> {
  return hasTauriRuntime()
    ? command<AnkiSyncConflict[]>('list_anki_sync_conflicts')
    : api<AnkiSyncConflict[]>('/api/anki/conflicts');
}

export function exportQueuedAnnotationsTsv(): Promise<ExportSummary> {
  return hasTauriRuntime()
    ? command<ExportSummary>('export_queued_annotations_tsv')
    : apiText('/api/anki/export.tsv').then((tsv) => {
        const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `witt-anki-export-${new Date().toISOString().slice(0, 10)}.tsv`;
        anchor.click();
        URL.revokeObjectURL(url);
        return { path: anchor.download, exported: 0 } satisfies ExportSummary;
      });
}

export function checkAnki(): Promise<AnkiStatus> {
  return hasTauriRuntime()
    ? command<AnkiStatus>('check_anki')
    : api<AnkiStatus>('/api/anki/status');
}

export function listAnkiDecks(): Promise<AnkiDeck[]> {
  return hasTauriRuntime()
    ? command<AnkiDeck[]>('list_anki_decks')
    : api<AnkiDeck[]>('/api/anki/decks');
}

export function listAnkiModels(): Promise<AnkiModelInfo[]> {
  return hasTauriRuntime()
    ? command<AnkiModelInfo[]>('list_anki_models')
    : api<AnkiModelInfo[]>('/api/anki/models');
}

export function selectAnkiDeck(deckName: string): Promise<void> {
  return hasTauriRuntime()
    ? command<void>('select_anki_deck', { deckName })
    : api<void>('/api/anki/decks/select', {
        method: 'POST',
        body: JSON.stringify({ deck_name: deckName }),
      });
}

export function refreshAnkiCache(deckName: string): Promise<AnkiNote[]> {
  return hasTauriRuntime()
    ? command<AnkiNote[]>('refresh_anki_cache', { deckName })
    : api<AnkiNote[]>('/api/anki/cache/refresh', {
        method: 'POST',
        body: JSON.stringify({ deck_name: deckName }),
      });
}

export function searchAnkiNotes(deckName?: string, query?: string): Promise<AnkiNote[]> {
  if (!hasTauriRuntime()) {
    const params = new URLSearchParams();
    if (deckName) params.set('deck_name', deckName);
    if (query) params.set('query', query);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return api<AnkiNote[]>(`/api/anki/notes${suffix}`);
  }
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
  return hasTauriRuntime()
    ? command<AnkiNote | null>('get_anki_note', { noteId })
    : api<AnkiNote | null>(`/api/anki/notes/${noteId}`);
}

export function listVocabulary(query?: string, bookId?: string): Promise<VocabularyEntry[]> {
  if (!hasTauriRuntime()) {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (bookId) params.set('book_id', bookId);
    const suffix = params.toString() ? `?${params.toString()}` : '';
    return api<VocabularyEntry[]>(`/api/vocabulary${suffix}`);
  }
  return command<VocabularyEntry[]>(
    'list_vocabulary',
    { query: query ?? null, bookId: bookId ?? null },
    () => []
  );
}

export function updateVocabularyStatus(
  word: string,
  status: VocabularyEntry['status']
): Promise<VocabularyEntry | null> {
  return hasTauriRuntime()
    ? command<VocabularyEntry | null>('update_vocabulary_status', { word, status })
    : api<VocabularyEntry | null>(`/api/vocabulary/${encodeURIComponent(word)}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
}

export function listWordOccurrences(word: string): Promise<WordOccurrence[]> {
  return hasTauriRuntime()
    ? command<WordOccurrence[]>('list_word_occurrences', { word })
    : api<WordOccurrence[]>(`/api/word-occurrences/${encodeURIComponent(word)}`);
}

export function listMeaningGroups(word: string): Promise<MeaningGroup[]> {
  return hasTauriRuntime()
    ? command<MeaningGroup[]>('list_meaning_groups', { word })
    : api<MeaningGroup[]>(`/api/meaning-groups/${encodeURIComponent(word)}`);
}

export function getDictionaryCache(
  word: string,
  promptId?: string
): Promise<DictionaryCacheEntry | null> {
  if (!hasTauriRuntime()) {
    const params = new URLSearchParams({ word });
    if (promptId) params.set('prompt_id', promptId);
    return api<DictionaryCacheEntry | null>(`/api/dictionary-cache?${params.toString()}`);
  }
  return command<DictionaryCacheEntry | null>(
    'get_dictionary_cache',
    { word, promptId: promptId ?? null },
    () => null
  );
}

export function saveDictionaryCache(draft: DictionaryCacheDraft): Promise<DictionaryCacheEntry> {
  return hasTauriRuntime()
    ? command<DictionaryCacheEntry>('save_dictionary_cache', { draft })
    : api<DictionaryCacheEntry>('/api/dictionary-cache', {
        method: 'PUT',
        body: JSON.stringify(draft),
      });
}

export function askLlmAboutSelection(request: SelectionLlmRequest): Promise<string> {
  return hasTauriRuntime()
    ? command<string>('ask_llm_about_selection', { request })
    : api<string>('/api/llm/selection', { method: 'POST', body: JSON.stringify(request) });
}

export function listPromptProfiles(): Promise<PromptProfile[]> {
  return hasTauriRuntime()
    ? command<PromptProfile[]>('list_prompt_profiles')
    : api<PromptProfile[]>('/api/prompts');
}

export function listPipelineProfiles(): Promise<PipelineProfile[]> {
  return hasTauriRuntime()
    ? command<PipelineProfile[]>('list_pipeline_profiles')
    : api<PipelineProfile[]>('/api/pipelines');
}

export function openPromptProfile(promptId: string): Promise<string> {
  return hasTauriRuntime()
    ? command<string>('open_prompt_profile', { promptId })
    : Promise.resolve('Edit prompts in the in-app editor.');
}

export function openPipelineProfile(pipelineId: string): Promise<string> {
  return hasTauriRuntime()
    ? command<string>('open_pipeline_profile', { pipelineId })
    : Promise.resolve('Edit pipelines in the in-app editor.');
}

export function readPromptProfile(promptId: string): Promise<string> {
  return hasTauriRuntime()
    ? command<string>('read_prompt_profile', { promptId })
    : apiText(`/api/prompts/${encodeURIComponent(promptId)}`);
}

export function savePromptProfile(promptId: string, content: string): Promise<void> {
  return hasTauriRuntime()
    ? command<void>('save_prompt_profile', { promptId, content })
    : api<void>(`/api/prompts/${encodeURIComponent(promptId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: content,
      });
}

export function readPipelineProfile(pipelineId: string): Promise<string> {
  return hasTauriRuntime()
    ? command<string>('read_pipeline_profile', { pipelineId })
    : apiText(`/api/pipelines/${encodeURIComponent(pipelineId)}`);
}

export function savePipelineProfile(pipelineId: string, content: string): Promise<void> {
  return hasTauriRuntime()
    ? command<void>('save_pipeline_profile', { pipelineId, content })
    : api<void>(`/api/pipelines/${encodeURIComponent(pipelineId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: content,
      });
}

export function loadPipelineProfile(pipelineId: string): Promise<AppSettings> {
  return hasTauriRuntime()
    ? command<AppSettings>('load_pipeline_profile', { pipelineId })
    : api<AppSettings>(`/api/pipelines/${encodeURIComponent(pipelineId)}/load`, {
        method: 'POST',
      });
}

export function getSettings(): Promise<AppSettings> {
  return hasTauriRuntime()
    ? command<AppSettings>('get_settings')
    : api<AppSettings>('/api/settings');
}

export function saveSettings(settings: AppSettings): Promise<void> {
  return hasTauriRuntime()
    ? command<void>('save_settings', { settings })
    : api<void>('/api/settings', { method: 'PUT', body: JSON.stringify(settings) });
}

export function saveLlmApiKey(apiKey: string): Promise<void> {
  return hasTauriRuntime()
    ? command<void>('save_llm_api_key', { apiKey })
    : api<void>('/api/llm/key', { method: 'PUT', body: JSON.stringify({ api_key: apiKey }) });
}

export function hasLlmApiKey(): Promise<boolean> {
  return hasTauriRuntime()
    ? command<boolean>('has_llm_api_key')
    : api<{ configured: boolean }>('/api/llm/key').then((r) => r.configured);
}

export function openAppConfig(): Promise<string> {
  return hasTauriRuntime()
    ? command<string>('open_app_config')
    : Promise.resolve('Edit settings in this browser. Server config is stored on the web host.');
}

export function reloadAppConfig(): Promise<AppSettings> {
  return hasTauriRuntime()
    ? command<AppSettings>('reload_app_config')
    : api<AppSettings>('/api/config/reload', { method: 'POST' });
}

export function getAppConfig(): Promise<AppConfig> {
  return hasTauriRuntime() ? command<AppConfig>('get_app_config') : api<AppConfig>('/api/config');
}

export function saveAppConfig(config: AppConfig): Promise<AppConfig> {
  return hasTauriRuntime()
    ? command<AppConfig>('save_app_config', { config })
    : api<AppConfig>('/api/config', { method: 'PUT', body: JSON.stringify(config) });
}
