import { create } from 'zustand';
import type { CaptureRequest, Source, Definition } from '@/types';
import * as commands from '@/lib/commands';
import { useToastStore } from './useToastStore';

/**
 * Capture slice state and actions
 */
interface CaptureSlice {
  // State
  currentCapture: Partial<CaptureRequest> & { definitions?: Definition[] } | null;
  isPopupOpen: boolean;
  isLoading: boolean;
  error: string | null;
  lastDiscardedCapture: Partial<CaptureRequest> | null;

  // Actions
  openPopup: (context: string, source: Source) => void;
  closePopup: () => void;
  updateCapture: (updates: Partial<CaptureRequest>) => void;
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
        context,
        source,
        word: '',
        lemma: '',
        language: 'en',
        tags: [],
        notes: '',
        definitions: [],
      },
      isPopupOpen: true,
      error: null,
    });
    
    // Auto-extract word from context (simple: first word)
    const firstWord = context.trim().split(/\s+/)[0] || '';
    get().updateCapture({ word: firstWord });
    
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

  updateCapture: (updates: Partial<CaptureRequest>) => {
    set((state) => ({
      currentCapture: state.currentCapture
        ? { ...state.currentCapture, ...updates }
        : updates,
    }));
  },

  saveCapture: async () => {
    const { currentCapture } = get();
    
    if (!currentCapture?.context || !currentCapture?.word) {
      set({ error: 'Context and word are required' });
      return null;
    }

    set({ isLoading: true, error: null });

    try {
      const request: CaptureRequest = {
        context: currentCapture.context,
        word: currentCapture.word,
        lemma: currentCapture.lemma,
        language: currentCapture.language,
        tags: currentCapture.tags || [],
        notes: currentCapture.notes,
        source: currentCapture.source || { type: 'app', name: 'Manual' },
      };
      
      const id = await commands.saveCapture(request);
      set({ isLoading: false, isPopupOpen: false, currentCapture: null });
      
      // Show success toast
      useToastStore.getState().addToast({
        message: 'Capture saved!',
        type: 'success',
        duration: 2000,
      });
      
      return id;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to save capture',
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
          context: '',
          word: '',
          lemma: '',
          language: 'en',
          tags: [],
          notes: '',
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
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));

/**
 * Fetch lemma and definitions for a word
 */
async function fetchLemmaAndDefinitions(word: string, language: string) {
  try {
    const [lemma, definitions] = await Promise.all([
      commands.getLemma({ word, language }),
      commands.getDefinitions({ word, language }),
    ]);

    const { updateCapture } = useCaptureStore.getState();
    updateCapture({ lemma, definitions } as Partial<CaptureRequest>);
  } catch (error) {
    console.error('Failed to fetch lemma/definitions:', error);
  }
}
