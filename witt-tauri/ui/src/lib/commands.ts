/**
 * Tauri IPC commands for communicating with the Rust backend
 * With centralized error handling and exception capture
 */
import { invoke } from '@tauri-apps/api/core';
import type {
  Note,
  Context,
  InboxItem,
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
  Source,
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

/**
 * Best-effort: simulate a system copy shortcut to capture current selection.
 * macOS requires Accessibility permission.
 */
export async function simulateCopyShortcut(): Promise<boolean> {
  return invokeWithErrorHandling<boolean>('simulate_copy_shortcut');
}

export type GlobalCursorPosition = { x: number; y: number };

/**
 * Get system/global cursor position in screen coordinates.
 */
export async function getGlobalCursorPosition(): Promise<GlobalCursorPosition> {
  return invokeWithErrorHandling<GlobalCursorPosition>('get_global_cursor_position');
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

export async function addToInbox(context: string, source: Source): Promise<InboxItem> {
  return invokeWithErrorHandling<InboxItem>('add_to_inbox', { context, source });
}

export async function getInboxItems(
  page: number,
  pageSize: number,
  search?: string,
  sourceType?: string,
  processed?: boolean,
  capturedAfter?: string,
  capturedBefore?: string
): Promise<PaginatedResponse<InboxItem>> {
  return invokeWithErrorHandling<PaginatedResponse<InboxItem>>('get_inbox_items', {
    page,
    pageSize,
    search: search ?? null,
    sourceType: sourceType ?? null,
    processed: processed ?? null,
    capturedAfter: capturedAfter ?? null,
    capturedBefore: capturedBefore ?? null,
  });
}

export async function getInboxCount(processed?: boolean): Promise<number> {
  return invokeWithErrorHandling<number>('get_inbox_count', { processed: processed ?? null });
}

export async function processInboxItem(itemId: string, lemmas: string[]): Promise<Note[]> {
  return invokeWithErrorHandling<Note[]>('process_inbox_item', { itemId, lemmas });
}

export async function deleteInboxItem(itemId: string): Promise<boolean> {
  return invokeWithErrorHandling<boolean>('delete_inbox_item', { itemId });
}

export async function setInboxItemProcessed(
  itemId: string,
  processed: boolean,
  notes?: string
): Promise<boolean> {
  return invokeWithErrorHandling<boolean>('set_inbox_item_processed', {
    itemId,
    processed,
    notes: notes ?? null,
  });
}

export async function clearProcessedInboxItems(): Promise<boolean> {
  return invokeWithErrorHandling<boolean>('clear_processed_inbox_items');
}

export async function extractWords(context: string): Promise<string[]> {
  return invokeWithErrorHandling<string[]>('extract_words', { context });
}

export type WordFrequency = [string, number];

export async function extractWordsWithFrequency(context: string): Promise<WordFrequency[]> {
  return invokeWithErrorHandling<WordFrequency[]>('extract_words_with_frequency', { context });
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
