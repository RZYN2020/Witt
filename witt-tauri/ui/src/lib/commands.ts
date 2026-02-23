/**
 * Tauri IPC commands for communicating with the Rust backend
 * With centralized error handling and exception capture
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
  NoteSummary,
  PaginatedResponse,
  BatchNoteRequest,
  BatchResult,
  AppStats,
} from '@/types';
import { classifyError, logError, ErrorType, type WittError } from './errors';

/**
 * Wrapper for invoke calls with standardized error handling
 */
async function invokeWithErrorHandling<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    const classifiedError = classifyError(error);
    logError(classifiedError, command);
    throw classifiedError;
  }
}

/**
 * Initialize WittCore
 */
export async function initCore(): Promise<void> {
  return invokeWithErrorHandling<void>('init_core');
}

/**
 * Get all notes with optional filtering
 */
export async function getNotes(filter?: NoteFilter): Promise<Note[]> {
  return invokeWithErrorHandling<Note[]>('get_notes', { filter });
}

/**
 * Get a single note by lemma
 */
export async function getNote(lemma: string): Promise<Note> {
  return invokeWithErrorHandling<Note>('get_note', { lemma });
}

/**
 * Save a new note
 */
export async function saveNote(request: NoteRequest): Promise<string> {
  return invokeWithErrorHandling<string>('save_note', { request });
}

/**
 * Update an existing note
 */
export async function updateNote(lemma: string, updates: NoteUpdate): Promise<Note> {
  return invokeWithErrorHandling<Note>('update_note', { lemma, updates });
}

/**
 * Delete a note
 */
export async function deleteNote(lemma: string): Promise<void> {
  return invokeWithErrorHandling<void>('delete_note', { lemma });
}

/**
 * Search notes by query
 */
export async function searchNotes(query: string): Promise<Note[]> {
  return invokeWithErrorHandling<Note[]>('search_notes', { query });
}

/**
 * Get all contexts for a note
 */
export async function getContexts(lemma: string): Promise<Context[]> {
  return invokeWithErrorHandling<Context[]>('get_contexts', { lemma });
}

/**
 * Save a new context
 */
export async function saveContext(lemma: string, context: Context): Promise<string> {
  return invokeWithErrorHandling<string>('save_context', { lemma, context });
}

/**
 * Update an existing context
 */
export async function updateContext(lemma: string, context: Context): Promise<Context> {
  return invokeWithErrorHandling<Context>('update_context', { lemma, context });
}

/**
 * Delete a context
 */
export async function deleteContext(lemma: string, contextId: string): Promise<void> {
  return invokeWithErrorHandling<void>('delete_context', { lemma, contextId });
}

/**
 * Get dictionary definitions for a word
 */
export async function getDefinitions(request: DefinitionRequest): Promise<Definition[]> {
  return invokeWithErrorHandling<Definition[]>('get_definitions', { request });
}

/**
 * Get lemma for a word
 */
export async function getLemma(request: LemmaRequest): Promise<string> {
  return invokeWithErrorHandling<string>('get_lemma', { request });
}

/**
 * Get tag suggestions
 */
export async function getTagSuggestions(prefix: string): Promise<string[]> {
  return invokeWithErrorHandling<string[]>('get_tag_suggestions', { prefix });
}

// ============================================================================
// Optimized Response Format Commands
// ============================================================================

/**
 * Get notes with pagination support (optimized for large datasets)
 */
export async function getNotesPaginated(
  page: number,
  pageSize: number,
  filter?: NoteFilter
): Promise<PaginatedResponse<NoteSummary>> {
  return invokeWithErrorHandling<PaginatedResponse<NoteSummary>>('get_notes_paginated', {
    page,
    pageSize,
    filter,
  });
}

/**
 * Batch save multiple notes in a single operation
 */
export async function batchSaveNotes(request: BatchNoteRequest): Promise<BatchResult> {
  return invokeWithErrorHandling<BatchResult>('batch_save_notes', { request });
}

/**
 * Get compact note summaries for efficient list rendering
 */
export async function getNoteSummaries(lemmas: string[]): Promise<NoteSummary[]> {
  return invokeWithErrorHandling<NoteSummary[]>('get_note_summaries', { lemmas });
}

/**
 * Bulk delete multiple notes
 */
export async function bulkDeleteNotes(lemmas: string[]): Promise<BatchResult> {
  return invokeWithErrorHandling<BatchResult>('bulk_delete_notes', { lemmas });
}

/**
 * Get application statistics
 */
export async function getStats(): Promise<AppStats> {
  return invokeWithErrorHandling<AppStats>('get_stats');
}

/**
 * Check if an error is a specific error type
 */
export function isErrorCode(error: unknown, code: ErrorType): boolean {
  return typeof error === 'object' && error !== null && 'type' in error && error.type === code;
}

/**
 * Extract error message from a Witt error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as WittError).message;
  }
  return String(error);
}
