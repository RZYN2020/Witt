import { invoke } from '@tauri-apps/api/core';

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

export interface AnkiDeck {
  name: string;
  selected: boolean;
  synced_at?: string | null;
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
  anki_endpoint: string;
}

export interface AnkiStatus {
  available: boolean;
  version?: number | null;
}

export interface SyncSummary {
  created: number;
  failed: Array<{ word: string; error: string }>;
}

export function importBook(sourcePath: string): Promise<BookRecord> {
  return invoke<BookRecord>('import_book', { sourcePath });
}

export function listBooks(): Promise<BookRecord[]> {
  return invoke<BookRecord[]>('list_books');
}

export function getBook(bookId: string): Promise<BookRecord | null> {
  return invoke<BookRecord | null>('get_book', { bookId });
}

export function removeBook(bookId: string): Promise<void> {
  return invoke<void>('remove_book', { bookId });
}

export function getBookFile(bookId: string): Promise<number[]> {
  return invoke<number[]>('get_book_file', { bookId });
}

export function saveProgress(progress: ReadingProgress): Promise<void> {
  return invoke<void>('save_progress', { progress });
}

export function getProgress(bookId: string): Promise<ReadingProgress | null> {
  return invoke<ReadingProgress | null>('get_progress', { bookId });
}

export function createAnnotation(draft: AnnotationDraft): Promise<Annotation> {
  return invoke<Annotation>('create_annotation', { draft });
}

export function listAnnotations(bookId?: string): Promise<Annotation[]> {
  return invoke<Annotation[]>('list_annotations', { bookId: bookId ?? null });
}

export function syncAnnotationsToAnki(): Promise<SyncSummary> {
  return invoke<SyncSummary>('sync_annotations_to_anki');
}

export function checkAnki(): Promise<AnkiStatus> {
  return invoke<AnkiStatus>('check_anki');
}

export function listAnkiDecks(): Promise<AnkiDeck[]> {
  return invoke<AnkiDeck[]>('list_anki_decks');
}

export function selectAnkiDeck(deckName: string): Promise<void> {
  return invoke<void>('select_anki_deck', { deckName });
}

export function refreshAnkiCache(deckName: string): Promise<AnkiNote[]> {
  return invoke<AnkiNote[]>('refresh_anki_cache', { deckName });
}

export function searchAnkiNotes(deckName?: string, query?: string): Promise<AnkiNote[]> {
  return invoke<AnkiNote[]>('search_anki_notes', {
    deckName: deckName ?? null,
    query: query ?? null,
  });
}

export function getAnkiNote(noteId: number): Promise<AnkiNote | null> {
  return invoke<AnkiNote | null>('get_anki_note', { noteId });
}

export function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>('get_settings');
}

export function saveSettings(settings: AppSettings): Promise<void> {
  return invoke<void>('save_settings', { settings });
}

export function saveLlmApiKey(apiKey: string): Promise<void> {
  return invoke<void>('save_llm_api_key', { apiKey });
}

export function hasLlmApiKey(): Promise<boolean> {
  return invoke<boolean>('has_llm_api_key');
}
