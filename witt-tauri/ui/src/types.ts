/**
 * Core data types for Witt application
 * These mirror the Rust models in src-tauri/src/models.rs
 */

/** Represents a word prototype (lemma) with contexts */
export interface Note {
  lemma: string;
  definition: string;
  pronunciation?: Audio | string;
  phonetics?: string;
  tags: string[];
  comment: string;
  deck: string;
  contexts: Context[];
  created_at: string;
  updated_at?: string;
}

/** A context where the word is used */
export interface Context {
  id: string;
  word_form: string;
  sentence: string;
  audio?: Audio | string;
  image?: Image | string;
  source: Source;
  created_at: string;
  updated_at?: string;
}

export interface InboxItem {
  id: string;
  context: string;
  source: Source;
  captured_at: string;
  processed: boolean;
  processing_notes?: string | null;
}

/** Audio file reference */
export interface Audio {
  file_path: string;
}

/** Image file reference */
export interface Image {
  file_path: string;
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

/** Note creation request from the UI */
export interface NoteRequest {
  lemma: string;
  definition: string;
  pronunciation?: string;
  phonetics?: string;
  tags: string[];
  comment?: string;
  deck?: string;
  context: Context;
  definitions?: Definition[];
}

export interface CaptureRequest {
  text: string;
  source: Source;
  mode?: 'capture' | 'inbox';
}

/** Note update request */
export interface NoteUpdate {
  definition?: string;
  pronunciation?: string;
  phonetics?: string;
  tags?: string[];
  comment?: string;
  deck?: string;
}

/** Filter options for note queries */
export interface NoteFilter {
  time_range?: TimeRange;
  source?: string;
  tags?: string[];
  search_query?: string;
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

// ============================================================================
// Optimized Response Types
// ============================================================================

/** Standardized API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

/** Paginated response for large datasets */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

/** Compact note summary for list views */
export interface NoteSummary {
  lemma: string;
  definition: string;
  context_count: number;
  tags: string[];
  created_at: string;
  updated_at?: string;
}

/** Batch note operation request */
export interface BatchNoteRequest {
  notes: NoteRequest[];
}

/** Batch operation result */
export interface BatchResult {
  successful: string[];
  failed: BatchError[];
}

/** Batch error information */
export interface BatchError {
  index: number;
  lemma: string;
  error: string;
}

/** Application statistics */
export interface AppStats {
  total_notes: number;
  total_contexts: number;
  unique_tags: number;
  notes_with_contexts: number;
}
