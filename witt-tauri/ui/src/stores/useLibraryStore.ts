import { create } from 'zustand';
import type { Note, NoteFilter, Context } from '@/types';
import * as commands from '@/lib/commands';
import { useToastStore } from './useToastStore';
import { useLoadingStore } from './useLoadingStore';
import { classifyError, getUserFriendlyMessage, logError } from '@/lib/errors';
import { withLoading, LoadingState } from '@/lib/loading';

/**
 * Library slice state and actions
 */
interface LibrarySlice {
  // State
  notes: Note[];
  filteredNotes: Note[];
  filter: NoteFilter;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  displayMode: 'notes' | 'cards'; // Notes shows lemma groups, Cards shows individual contexts
  deckFilter: string | 'all'; // Filter by deck
  isLoading: boolean;
  error: string | null;
  selectedNotes: Set<string>;

  // Actions
  loadNotes: (filter?: NoteFilter) => Promise<void>;
  setFilter: (filter: Partial<NoteFilter>) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setDisplayMode: (mode: 'notes' | 'cards') => void;
  setDeckFilter: (deck: string | 'all') => void;
  selectNote: (lemma: string, multi?: boolean) => void;
  deselectNote: (lemma: string) => void;
  deselectAll: () => void;
  deleteNote: (lemma: string) => Promise<void>;
  clearFilters: () => void;
  addNote: (note: Note) => void;
  getDecks: () => string[];
}

export const useLibraryStore = create<LibrarySlice>((set, get) => ({
  notes: [],
  filteredNotes: [],
  filter: { time_range: 'all' },
  searchQuery: '',
  viewMode: 'grid',
  displayMode: 'notes',
  deckFilter: 'all',
  isLoading: false,
  error: null,
  selectedNotes: new Set(),

  loadNotes: async (filter?: NoteFilter) => {
    set({ isLoading: true, error: null });
    useLoadingStore.getState().setLoading(true);

    try {
      // Use withLoading for better UX
      const notes = await withLoading(
        async () => {
          return commands.getNotes(filter);
        },
        { minDisplayTime: 150 }
      );

      set({
        notes,
        filteredNotes: notes,
        isLoading: false,
        filter: filter || get().filter,
      });
      useLoadingStore.getState().setLoading(false);
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'loadNotes');

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
    }
  },

  setFilter: (filter: Partial<NoteFilter>) => {
    const newFilter = { ...get().filter, ...filter };
    set({ filter: newFilter });
    applyFilters(newFilter, get().searchQuery);
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    applyFilters(get().filter, query);
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
    // Persist to localStorage
    localStorage.setItem('witt:viewMode', mode);
  },

  setDisplayMode: (mode) => {
    set({ displayMode: mode });
    localStorage.setItem('witt:displayMode', mode);
  },

  setDeckFilter: (deck) => {
    set({ deckFilter: deck });
    localStorage.setItem('witt:deckFilter', deck);
    // Re-apply filters when deck changes
    applyFilters(get().filter, get().searchQuery);
  },

  selectNote: (lemma: string, multi?: boolean) => {
    set((state) => {
      const newSelected = new Set(multi ? state.selectedNotes : []);
      newSelected.add(lemma);
      return { selectedNotes: newSelected };
    });
  },

  deselectNote: (lemma: string) => {
    set((state) => {
      const newSelected = new Set(state.selectedNotes);
      newSelected.delete(lemma);
      return { selectedNotes: newSelected };
    });
  },

  deselectAll: () => {
    set({ selectedNotes: new Set() });
  },

  deleteNote: async (lemma: string) => {
    const operationId = `delete-${lemma}`;
    useLoadingStore.getState().addIndicator({
      id: operationId,
      type: LoadingState.LOADING,
      message: 'Deleting note...',
      createdAt: Date.now(),
    });

    try {
      await commands.deleteNote(lemma);
      // Remove from local state
      set((state) => ({
        notes: state.notes.filter((n) => n.lemma !== lemma),
        filteredNotes: state.filteredNotes.filter((n) => n.lemma !== lemma),
      }));

      // Remove indicator and show success
      useLoadingStore.getState().removeIndicator(operationId);

      // Show success toast
      useToastStore.getState().addToast({
        message: 'Note deleted',
        type: 'success',
        duration: 2000,
      });
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'deleteNote');

      const userMessage = getUserFriendlyMessage(classifiedError);

      set({
        error: userMessage,
      });

      // Update indicator to error state
      useLoadingStore.getState().updateIndicator(operationId, {
        type: LoadingState.ERROR,
        message: userMessage,
      });

      // Show error toast
      useToastStore.getState().addToast({
        message: userMessage,
        type: 'error',
        duration: 4000,
      });
    }
  },

  clearFilters: () => {
    set({
      filter: { time_range: 'all' },
      searchQuery: '',
    });
    applyFilters({ time_range: 'all' }, '');
  },

  addNote: (note: Note) => {
    set((state) => ({
      notes: [note, ...state.notes],
      filteredNotes: [note, ...state.filteredNotes],
    }));
  },

  getDecks: (): string[] => {
    const state = useLibraryStore.getState();
    const decks = Array.from(new Set(state.notes.map((n: Note) => n.deck)));
    return decks.sort();
  },
}));

/**
 * Apply filters to the note list
 */
async function applyFilters(filter: NoteFilter, searchQuery: string) {
  const { notes } = useLibraryStore.getState();

  let filtered = [...notes];

  // Apply time range filter
  if (filter.time_range && filter.time_range !== 'all') {
    const cutoffDate = new Date();

    if (filter.time_range === 'today') {
      cutoffDate.setHours(0, 0, 0, 0);
    } else if (filter.time_range === 'this_week') {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (filter.time_range === 'this_month') {
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    }

    filtered = filtered.filter((note: Note) => {
      const noteDate = new Date(note.created_at);
      return noteDate >= cutoffDate;
    });
  }

  // Apply search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (note: Note) =>
        note.lemma.toLowerCase().includes(query) ||
        note.definition.toLowerCase().includes(query) ||
        note.contexts.some(
          (ctx: Context) =>
            ctx.word_form.toLowerCase().includes(query) ||
            ctx.sentence.toLowerCase().includes(query)
        ) ||
        note.tags.some((tag: string) => tag.toLowerCase().includes(query))
    );
  }

  useLibraryStore.getState().filteredNotes = filtered;
}

// Load saved view mode on initialization
try {
  if (typeof localStorage !== 'undefined' && localStorage) {
    const savedViewMode = localStorage.getItem('witt:viewMode') as 'grid' | 'list' | null;
    if (savedViewMode) {
      useLibraryStore.getState().viewMode = savedViewMode;
    }
  }
} catch (error) {
  console.warn('Failed to load view mode from localStorage:', error);
}
