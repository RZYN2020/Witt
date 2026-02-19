/**
 * Tauri IPC commands for communicating with the Rust backend
 */
import { invoke } from '@tauri-apps/api/core';
import type {
  Card,
  CaptureRequest,
  LibraryFilter,
  Definition,
  LemmaRequest,
  DefinitionRequest,
} from '@/types';

/**
 * Get all library cards with optional filtering
 */
export async function getLibraryCards(filter?: LibraryFilter): Promise<Card[]> {
  return invoke<Card[]>('get_library_cards', { filter });
}

/**
 * Get a single card by ID
 */
export async function getCard(id: string): Promise<Card> {
  return invoke<Card>('get_card', { id });
}

/**
 * Save a new capture
 */
export async function saveCapture(request: CaptureRequest): Promise<string> {
  return invoke<string>('save_capture', { request });
}

/**
 * Update an existing card
 */
export async function updateCard(id: string, updates: Card): Promise<Card> {
  return invoke<Card>('update_card', { id, updates });
}

/**
 * Delete a card
 */
export async function deleteCard(id: string): Promise<void> {
  return invoke<void>('delete_card', { id });
}

/**
 * Search cards by query
 */
export async function searchCards(query: string): Promise<Card[]> {
  return invoke<Card[]>('search_cards', { query });
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
