import { create } from 'zustand';
import type { Card, LibraryFilter } from '@/types';
import * as commands from '@/lib/commands';

/**
 * Library slice state and actions
 */
interface LibrarySlice {
  // State
  cards: Card[];
  filteredCards: Card[];
  filter: LibraryFilter;
  searchQuery: string;
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  error: string | null;
  selectedCards: Set<string>;

  // Actions
  loadCards: (filter?: LibraryFilter) => Promise<void>;
  setFilter: (filter: Partial<LibraryFilter>) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  selectCard: (id: string, multi?: boolean) => void;
  deselectCard: (id: string) => void;
  deselectAll: () => void;
  deleteCard: (id: string) => Promise<void>;
  clearFilters: () => void;
  addCard: (card: Card) => void;
}

export const useLibraryStore = create<LibrarySlice>((set, get) => ({
  cards: [],
  filteredCards: [],
  filter: { timeRange: 'all' },
  searchQuery: '',
  viewMode: 'grid',
  isLoading: false,
  error: null,
  selectedCards: new Set(),

  loadCards: async (filter?: LibraryFilter) => {
    set({ isLoading: true, error: null });
    
    try {
      const cards = await commands.getLibraryCards(filter);
      set({
        cards,
        filteredCards: cards,
        isLoading: false,
        filter: filter || get().filter,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load cards',
      });
    }
  },

  setFilter: (filter: Partial<LibraryFilter>) => {
    const newFilter = { ...get().filter, ...filter };
    set({ filter: newFilter });
    applyFilters(newFilter, get().searchQuery);
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    applyFilters(get().filter, query);
  },

  setViewMode: (mode: 'grid' | 'list') => {
    set({ viewMode: mode });
    // Persist to localStorage
    localStorage.setItem('witt:viewMode', mode);
  },

  selectCard: (id: string, multi?: boolean) => {
    set((state) => {
      const newSelected = new Set(multi ? state.selectedCards : []);
      newSelected.add(id);
      return { selectedCards: newSelected };
    });
  },

  deselectCard: (id: string) => {
    set((state) => {
      const newSelected = new Set(state.selectedCards);
      newSelected.delete(id);
      return { selectedCards: newSelected };
    });
  },

  deselectAll: () => {
    set({ selectedCards: new Set() });
  },

  deleteCard: async (id: string) => {
    try {
      await commands.deleteCard(id);
      // Remove from local state
      set((state) => ({
        cards: state.cards.filter((c) => c.id !== id),
        filteredCards: state.filteredCards.filter((c) => c.id !== id),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete card',
      });
    }
  },

  clearFilters: () => {
    set({
      filter: { timeRange: 'all' },
      searchQuery: '',
    });
    applyFilters({ timeRange: 'all' }, '');
  },

  addCard: (card: Card) => {
    set((state) => ({
      cards: [card, ...state.cards],
      filteredCards: [card, ...state.filteredCards],
    }));
  },
}));

/**
 * Apply filters to the card list
 */
async function applyFilters(filter: LibraryFilter, searchQuery: string) {
  const { cards } = useLibraryStore.getState();
  
  let filtered = [...cards];

  // Apply time range filter
  if (filter.timeRange && filter.timeRange !== 'all') {
    const cutoffDate = new Date();
    
    if (filter.timeRange === 'today') {
      cutoffDate.setHours(0, 0, 0, 0);
    } else if (filter.timeRange === 'this_week') {
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else if (filter.timeRange === 'this_month') {
      cutoffDate.setDate(cutoffDate.getDate() - 30);
    }
    
    filtered = filtered.filter((card) => {
      const cardDate = new Date(card.createdAt);
      return cardDate >= cutoffDate;
    });
  }

  // Apply search query
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (card) =>
        card.word.toLowerCase().includes(query) ||
        card.context.toLowerCase().includes(query) ||
        card.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  useLibraryStore.getState().filteredCards = filtered;
}

// Load saved view mode on initialization
const savedViewMode = localStorage.getItem('witt:viewMode') as 'grid' | 'list' | null;
if (savedViewMode) {
  useLibraryStore.getState().viewMode = savedViewMode;
}
