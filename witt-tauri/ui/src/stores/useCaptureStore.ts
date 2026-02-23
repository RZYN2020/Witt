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

  // Actions
  openPopup: (context: string, source: Source) => void;
  closePopup: () => void;
  updateCapture: (updates: Partial<NoteRequest>) => void;
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
};

export const useCaptureStore = create<CaptureSlice>((set, get) => ({
  ...initialState,

  openPopup: (context: string, source: Source) => {
    set({
      currentCapture: {
        context: {
          id: crypto.randomUUID(),
          word_form: '',
          sentence: context,
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
    });

    // Auto-extract word from context (simple: first word)
    const firstWord = context.trim().split(/\s+/)[0] || '';
    get().updateCapture({
      context: {
        id: crypto.randomUUID(),
        word_form: firstWord,
        sentence: context,
        audio: undefined,
        image: undefined,
        source,
        created_at: new Date().toISOString(),
      },
    });

    // Fetch lemma and definitions
    setTimeout(() => {
      fetchLemmaAndDefinitions(firstWord, 'en');
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
