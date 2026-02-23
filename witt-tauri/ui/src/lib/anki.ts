/**
 * Anki synchronization utilities
 */
import { invoke } from '@tauri-apps/api/core';
import { generateAPKG, downloadAPKG as downloadAPKGFile } from './apkg';
import type { Note } from '@/types';

/**
 * Export notes to APKG file
 */
export async function exportToAPKG(_lemmas: string[], notes: Note[]): Promise<Blob> {
  console.log('[APKG Export] Starting export:', { notesCount: notes.length });

  try {
    // Generate APKG file
    const apkgBlob = await generateAPKG(notes);
    console.log('[APKG Export] APKG generated:', apkgBlob.size, 'bytes');
    return apkgBlob;
  } catch (error) {
    console.error('[APKG Export] Export failed:', error);
    throw error;
  }
}

/**
 * Download APKG file
 */
export function downloadAPKG(blob: Blob, fileName: string): void {
  downloadAPKGFile(blob, fileName);
}

/**
 * Sync notes to Anki via AnkiConnect
 */
export async function syncToAnki(lemmas: string[]): Promise<SyncResult> {
  console.log('[Anki Sync] Starting sync:', { lemmasCount: lemmas.length });

  try {
    const result = await invoke<SyncResult>('sync_to_anki', { lemmas });
    console.log('[Anki Sync] Sync completed:', result);
    return result;
  } catch (error) {
    console.error('[Anki Sync] Sync failed:', error);
    throw error;
  }
}

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  failed: Array<{
    lemma: string;
    error: string;
  }>;
}

/**
 * Check AnkiConnect connection
 */
export async function checkAnkiConnect(): Promise<AnkiStatus> {
  try {
    return await invoke<AnkiStatus>('check_anki_connect');
  } catch (error) {
    console.error('[Anki Check] Failed:', error);
    return { available: false, version: undefined };
  }
}

/**
 * Anki connection status
 */
export interface AnkiStatus {
  available: boolean;
  version?: number;
}

/**
 * Get available decks from Anki
 */
export async function getAnkiDecks(): Promise<string[]> {
  try {
    return await invoke<string[]>('get_anki_decks');
  } catch (error) {
    console.error('[Anki Decks] Failed to load:', error);
    return [];
  }
}
