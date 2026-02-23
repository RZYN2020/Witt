import { create } from 'zustand';
import type { Note, NoteFilter } from '@/types';
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

      const effectiveFilter = filter || get().filter;
      const filteredNotes = computeFilteredNotes(
        notes,
        effectiveFilter,
        get().searchQuery,
        get().deckFilter
      );

      set({
        notes,
        filteredNotes,
        isLoading: false,
        filter: effectiveFilter,
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
    set((state) => {
      const newFilter = { ...state.filter, ...filter };
      return {
        filter: newFilter,
        filteredNotes: computeFilteredNotes(
          state.notes,
          newFilter,
          state.searchQuery,
          state.deckFilter
        ),
      };
    });
  },

  setSearchQuery: (query: string) => {
    set((state) => ({
      searchQuery: query,
      filteredNotes: computeFilteredNotes(state.notes, state.filter, query, state.deckFilter),
    }));
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
    // Persist to localStorage
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:viewMode', mode);
      }
    } catch {
      // ignore storage errors (e.g. in tests)
    }
  },

  setDisplayMode: (mode) => {
    set({ displayMode: mode });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:displayMode', mode);
      }
    } catch {
      // ignore storage errors (e.g. in tests)
    }
  },

  setDeckFilter: (deck) => {
    set((state) => ({
      deckFilter: deck,
      filteredNotes: computeFilteredNotes(state.notes, state.filter, state.searchQuery, deck),
    }));
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:deckFilter', deck);
      }
    } catch {
      // ignore storage errors (e.g. in tests)
    }
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
    set((state) => {
      const resetFilter: NoteFilter = { time_range: 'all' };
      return {
        filter: resetFilter,
        searchQuery: '',
        deckFilter: 'all',
        filteredNotes: computeFilteredNotes(state.notes, resetFilter, '', 'all'),
      };
    });
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

function computeFilteredNotes(
  notes: Note[],
  filter: NoteFilter,
  searchQuery: string,
  deckFilter: string | 'all'
): Note[] {
  let filtered = [...notes];

  // Deck filter
  if (deckFilter && deckFilter !== 'all') {
    filtered = filtered.filter((note) => note.deck === deckFilter);
  }

  // Source filter (by Source.type: web/video/pdf/app)
  if (filter.source) {
    const source = String(filter.source).toLowerCase();
    filtered = filtered.filter((note) =>
      note.contexts.some((ctx) => String(ctx.source?.type).toLowerCase() === source)
    );
  }

  // Tags filter (require all selected tags)
  if (filter.tags && filter.tags.length > 0) {
    const tags = filter.tags.map((t) => t.toLowerCase());
    filtered = filtered.filter((note) =>
      tags.every((t) => note.tags.some((nt) => nt.toLowerCase() === t))
    );
  }

  // Time range filter
  if (filter.time_range && filter.time_range !== 'all') {
    const cutoffDate = new Date();

    if (filter.time_range === 'today') {
      cutoffDate.setHours(0, 0, 0, 0);
    } else if (filter.time_range === 'this_week') {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (filter.time_range === 'this_month') {
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    }

    filtered = filtered.filter((note) => new Date(note.created_at) >= cutoffDate);
  }

  // Search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (note) =>
        note.lemma.toLowerCase().includes(query) ||
        note.definition.toLowerCase().includes(query) ||
        note.contexts.some(
          (ctx) =>
            ctx.word_form.toLowerCase().includes(query) || ctx.sentence.toLowerCase().includes(query)
        ) ||
        note.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  return filtered;
}

// Load saved view mode on initialization
try {
  if (typeof localStorage?.getItem === 'function') {
    const savedViewMode = localStorage.getItem('witt:viewMode') as 'grid' | 'list' | null;
    if (savedViewMode) {
      useLibraryStore.getState().viewMode = savedViewMode;
    }

    const savedDeckFilter = localStorage.getItem('witt:deckFilter') as string | null;
    if (savedDeckFilter) {
      useLibraryStore.getState().deckFilter = savedDeckFilter as any;
    }
  }
} catch (error) {
  console.warn('Failed to load view mode from localStorage:', error);
}
