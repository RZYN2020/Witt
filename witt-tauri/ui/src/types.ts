/**
 * Core data types for Witt application
 * These mirror the Rust models in src-tauri/src/models.rs
 */

/** Represents a captured word card with context */
export interface Card {
  id: string;
  word: string;
  lemma: string;
  context: string;
  definitions: Definition[];
  tags: string[];
  source: Source;
  notes?: string;
  language: string;
  createdAt: string;
  updatedAt?: string;
}

/** A dictionary definition for a word */
export interface Definition {
  id: string;
  text: string;
  source: string;
  partOfSpeech?: string;
  isCustom: boolean;
  isUserEdited: boolean;
}

/** Source metadata for where the capture originated */
export type Source =
  | {
      type: 'web';
      title: string;
      url: string;
      icon?: string;
    }
  | {
      type: 'video';
      filename: string;
      timestamp: string;
      frame?: number;
    }
  | {
      type: 'pdf';
      filename: string;
      page?: number;
    }
  | {
      type: 'app';
      name: string;
      title?: string;
    };

/** Capture request from the UI */
export interface CaptureRequest {
  context: string;
  word: string;
  lemma?: string;
  language?: string;
  tags: string[];
  notes?: string;
  source: Source;
  definitions?: Definition[];
}

/** Filter options for library queries */
export interface LibraryFilter {
  timeRange?: TimeRange;
  source?: string;
  tags?: string[];
  searchQuery?: string;
}

export type TimeRange = 'today' | 'this_week' | 'this_month' | 'all';

/** Lemma extraction request */
export interface LemmaRequest {
  word: string;
  language: string;
}

/** Definition lookup request */
export interface DefinitionRequest {
  word: string;
  language: string;
}

/** Mock mode indicator */
export const IS_MOCK_MODE = true;
