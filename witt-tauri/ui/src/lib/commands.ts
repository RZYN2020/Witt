/**
 * Tauri IPC commands for communicating with the Rust backend
 */
import { invoke } from '@tauri-apps/api/core';
import type {
  Note,
  Context,
  NoteRequest,
  NoteUpdate,
  NoteFilter,
  Definition,
  LemmaRequest,
  DefinitionRequest,
} from '@/types';

/**
 * Initialize WittCore
 */
export async function initCore(): Promise<void> {
  return invoke<void>('init_core');
}

/**
 * Get all notes with optional filtering
 */
export async function getNotes(filter?: NoteFilter): Promise<Note[]> {
  return invoke<Note[]>('get_notes', { filter });
}

/**
 * Get a single note by lemma
 */
export async function getNote(lemma: string): Promise<Note> {
  return invoke<Note>('get_note', { lemma });
}

/**
 * Save a new note
 */
export async function saveNote(request: NoteRequest): Promise<string> {
  return invoke<string>('save_note', { request });
}

/**
 * Update an existing note
 */
export async function updateNote(lemma: string, updates: NoteUpdate): Promise<Note> {
  return invoke<Note>('update_note', { lemma, updates });
}

/**
 * Delete a note
 */
export async function deleteNote(lemma: string): Promise<void> {
  return invoke<void>('delete_note', { lemma });
}

/**
 * Search notes by query
 */
export async function searchNotes(query: string): Promise<Note[]> {
  return invoke<Note[]>('search_notes', { query });
}

/**
 * Get all contexts for a note
 */
export async function getContexts(lemma: string): Promise<Context[]> {
  return invoke<Context[]>('get_contexts', { lemma });
}

/**
 * Save a new context
 */
export async function saveContext(lemma: string, context: Context): Promise<string> {
  return invoke<string>('save_context', { lemma, context });
}

/**
 * Update an existing context
 */
export async function updateContext(lemma: string, context: Context): Promise<Context> {
  return invoke<Context>('update_context', { lemma, context });
}

/**
 * Delete a context
 */
export async function deleteContext(lemma: string, contextId: string): Promise<void> {
  return invoke<void>('delete_context', { lemma, contextId });
}

/**
 * Get dictionary definitions for a word
 */
export async function getDefinitions(request: DefinitionRequest): Promise<Definition[]> {
  return invoke<Definition[]>('get_definitions', { request });
}

/**
 * Get lemma for a word
 */
export async function getLemma(request: LemmaRequest): Promise<string> {
  return invoke<string>('get_lemma', { request });
}

/**
 * Get tag suggestions
 */
export async function getTagSuggestions(prefix: string): Promise<string[]> {
  return invoke<string[]>('get_tag_suggestions', { prefix });
}
