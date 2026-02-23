import { create } from 'zustand';
import type { NoteRequest, Source, Definition } from '@/types';
import * as commands from '@/lib/commands';
import { useToastStore } from './useToastStore';
import { useLoadingStore } from './useLoadingStore';
import { useLibraryStore } from './useLibraryStore';
import { classifyError, getUserFriendlyMessage, logError } from '@/lib/errors';
import { withLoading, LoadingState } from '@/lib/loading';

/**
 * Capture slice state and actions
 */
interface CaptureSlice {
  // State
  currentCapture: (Partial<NoteRequest> & { definitions?: Definition[] }) | null;
  isPopupOpen: boolean;
  isLoading: boolean;
  error: string | null;
  lastDiscardedCapture: Partial<NoteRequest> | null;

  // Capture helper state
  language: string;
  autoWordForm: boolean;

  // Actions
  openPopup: (context: string, source: Source) => void;
  closePopup: () => void;
  updateCapture: (updates: Partial<NoteRequest>) => void;
  setSentence: (sentence: string) => void;
  setWordForm: (wordForm: string) => void;
  setLanguage: (language: string) => void;
  saveCapture: () => Promise<string | null>;
  saveAndNext: () => Promise<boolean>;
  discardCapture: () => void;
  restoreLastDiscarded: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const initialState = {
  currentCapture: null,
  isPopupOpen: false,
  isLoading: false,
  error: null,
  lastDiscardedCapture: null,
  language: 'en',
  autoWordForm: true,
};

export const useCaptureStore = create<CaptureSlice>((set, get) => ({
  ...initialState,

  openPopup: (context: string, source: Source) => {
    const sentence = context;
    const wordForm = extractCandidateWord(sentence);
    const ctxId = crypto.randomUUID();

    set({
      currentCapture: {
        context: {
          id: ctxId,
          word_form: wordForm,
          sentence,
          audio: undefined,
          image: undefined,
          source,
          created_at: new Date().toISOString(),
        },
        lemma: '',
        definition: '',
        pronunciation: undefined,
        phonetics: '',
        tags: [],
        comment: '',
        deck: 'Default',
        definitions: [],
      },
      isPopupOpen: true,
      error: null,
      autoWordForm: true,
    });

    // Fetch lemma and definitions (best effort)
    const lang = get().language || 'en';
    setTimeout(() => {
      if (wordForm) {
        fetchLemmaAndDefinitions(wordForm, lang);
      }
    }, 100);
  },

  closePopup: () => {
    set({
      isPopupOpen: false,
      currentCapture: null,
      error: null,
    });
  },

  updateCapture: (updates: Partial<NoteRequest>) => {
    set((state) => ({
      currentCapture: state.currentCapture ? { ...state.currentCapture, ...updates } : updates,
    }));
  },

  setSentence: (sentence: string) => {
    set((state) => {
      const current = state.currentCapture;
      if (!current?.context) {
        return {
          currentCapture: {
            ...current,
            context: {
              id: crypto.randomUUID(),
              word_form: '',
              sentence,
              source: { type: 'app', name: 'Manual' } as any,
              created_at: new Date().toISOString(),
            } as any,
          },
        };
      }

      let nextWordForm = current.context.word_form || '';
      if (state.autoWordForm) {
        const candidate = extractCandidateWord(sentence);
        if (candidate) nextWordForm = candidate;
      }

      return {
        currentCapture: {
          ...current,
          context: {
            ...current.context,
            sentence,
            word_form: nextWordForm,
          },
        },
      };
    });

    // If we are still auto-selecting word, refresh lemma/definitions
    if (get().autoWordForm) {
      const word = get().currentCapture?.context?.word_form || '';
      if (word) {
        fetchLemmaAndDefinitions(word, get().language || 'en');
      }
    }
  },

  setWordForm: (wordForm: string) => {
    set((state) => {
      const current = state.currentCapture;
      if (!current?.context) return { autoWordForm: false };
      return {
        autoWordForm: false,
        currentCapture: {
          ...current,
          context: {
            ...current.context,
            word_form: wordForm,
          },
        },
      };
    });

    const word = wordForm.trim();
    if (word) {
      fetchLemmaAndDefinitions(word, get().language || 'en');
    }
  },

  setLanguage: (language: string) => {
    set({ language });
    const word = get().currentCapture?.context?.word_form?.trim();
    if (word) {
      fetchLemmaAndDefinitions(word, language);
    }
  },

  saveCapture: async () => {
    const { currentCapture } = get();

    if (!currentCapture?.context?.sentence || !currentCapture?.context?.word_form) {
      set({ error: 'Context and word form are required' });
      return null;
    }

    set({ isLoading: true, error: null });

    // Use loading indicator
    useLoadingStore.getState().setLoading(true);

    try {
      const request: NoteRequest = {
        lemma: currentCapture.lemma || currentCapture.context.word_form,
        definition: currentCapture.definition || '',
        pronunciation: currentCapture.pronunciation,
        phonetics: currentCapture.phonetics,
        tags: currentCapture.tags || [],
        comment: currentCapture.comment || '',
        deck: currentCapture.deck || 'Default',
        context: currentCapture.context,
      };

      // Use withLoading for better UX
      await withLoading(
        async () => {
          const lemma = await commands.saveNote(request);
          return lemma;
        },
        { minDisplayTime: 200 }
      );

      set({ isLoading: false, isPopupOpen: false, currentCapture: null });
      useLoadingStore.getState().setLoading(false);

      // Refresh library to show the new note
      try {
        await useLibraryStore.getState().loadNotes();
      } catch (refreshError) {
        console.warn('Failed to refresh library after save:', refreshError);
      }

      // Show success toast
      useToastStore.getState().addToast({
        message: 'Note saved!',
        type: 'success',
        duration: 2000,
      });

      return request.lemma;
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'saveCapture');

      const userMessage = getUserFriendlyMessage(classifiedError);

      set({
        isLoading: false,
        error: userMessage,
      });

      useLoadingStore.getState().setLoading(false);

      // Show error toast
      useToastStore.getState().addToast({
        message: userMessage,
        type: 'error',
        duration: 4000,
      });

      return null;
    }
  },

  saveAndNext: async () => {
    const saved = await get().saveCapture();
    if (saved) {
      // Reset for next capture
      set({
        currentCapture: {
          context: {
            id: crypto.randomUUID(),
            word_form: '',
            sentence: '',
            audio: undefined,
            image: undefined,
            source: { type: 'app', name: 'Manual' },
            created_at: new Date().toISOString(),
          },
          lemma: '',
          definition: '',
          pronunciation: undefined,
          phonetics: '',
          tags: [],
          comment: '',
          deck: 'Default',
          definitions: [],
        },
        isPopupOpen: true,
        error: null,
        autoWordForm: true,
      });
      return true;
    }
    return false;
  },

  discardCapture: () => {
    const { currentCapture } = get();

    // Store for potential undo
    set({
      lastDiscardedCapture: currentCapture,
      isPopupOpen: false,
      currentCapture: null,
      error: null,
    });

    // Show undo toast
    useToastStore.getState().addToast({
      message: 'Capture discarded',
      type: 'info',
      action: {
        label: 'Undo',
        onClick: () => {
          get().restoreLastDiscarded();
        },
      },
      duration: 3000,
    });
  },

  restoreLastDiscarded: () => {
    const { lastDiscardedCapture } = get();

    if (lastDiscardedCapture) {
      set({
        currentCapture: lastDiscardedCapture,
        isPopupOpen: true,
        lastDiscardedCapture: null,
        error: null,
      });
    }
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
    useLoadingStore.getState().setLoading(loading);
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));

/**
 * Fetch lemma and definitions for a word with loading indicator
 */
async function fetchLemmaAndDefinitions(word: string, language: string) {
  const operationId = 'fetch-lemma-definitions';

  try {
    useLoadingStore.getState().addIndicator({
      id: operationId,
      type: LoadingState.LOADING,
      message: 'Looking up word...',
      createdAt: Date.now(),
    });

    const [lemma, definitions] = await Promise.all([
      commands.getLemma({ word, language }),
      commands.getDefinitions({ word, language }),
    ]);

    const { updateCapture } = useCaptureStore.getState();
    updateCapture({ lemma, definitions } as Partial<NoteRequest>);

    // Remove indicator
    useLoadingStore.getState().removeIndicator(operationId);
  } catch (error) {
    const classifiedError = classifyError(error);
    logError(classifiedError, 'fetchLemmaAndDefinitions');

    // Remove indicator
    useLoadingStore.getState().removeIndicator(operationId);

    // Don't show error toast for lemma/definition fetch failures
    // as they are non-critical and the user can still manually enter data
    console.warn('Failed to fetch lemma/definitions, continuing with manual entry');
  }
}

function extractCandidateWord(sentence: string): string {
  const text = sentence.trim();
  if (!text) return '';

  // If it's a single token, use it
  const tokens = text
    .split(/\s+/)
    .map((t) => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);

  if (tokens.length === 0) return '';
  if (tokens.length === 1) return tokens[0];

  // Heuristic: pick the longest alphabetic token
  const alpha = tokens.filter((t) => /\p{L}/u.test(t));
  const candidates = alpha.length > 0 ? alpha : tokens;
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0] || tokens[0];
}
