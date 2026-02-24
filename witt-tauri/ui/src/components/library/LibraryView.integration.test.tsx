import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryView } from './LibraryView';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useInboxStore } from '@/stores/useInboxStore';

vi.mock('@/stores/useLibraryStore');
vi.mock('@/stores/useInboxStore');

describe('LibraryView (integration)', () => {
  const loadNotes = vi.fn();
  const loadItems = vi.fn();
  const refreshUnprocessedCount = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useLibraryStore as unknown as vi.Mock).mockReturnValue({
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
      loadNotes,
      setFilter: vi.fn(),
      setSearchQuery: vi.fn(),
      setViewMode: vi.fn(),
      setDisplayMode: vi.fn(),
      setDeckFilter: vi.fn(),
      selectNote: vi.fn(),
      deselectNote: vi.fn(),
      deselectAll: vi.fn(),
      deleteNote: vi.fn(),
      clearFilters: vi.fn(),
      addNote: vi.fn(),
      getDecks: () => [],
    });

    (useInboxStore as unknown as vi.Mock).mockReturnValue({
      items: [],
      isLoading: false,
      isProcessing: false,
      error: null,
      unprocessedCount: 2,
      currentPage: 0,
      pageSize: 10,
      total: 0,
      searchTerm: '',
      sourceType: null,
      processedFilter: 'unprocessed',
      capturedAfter: null,
      capturedBefore: null,
      selected: new Set(),
      loadItems,
      refreshUnprocessedCount,
      setSearchTerm: vi.fn(),
      setSourceType: vi.fn(),
      setProcessedFilter: vi.fn(),
      setCapturedAfter: vi.fn(),
      setCapturedBefore: vi.fn(),
      setPageSize: vi.fn(),
      goToPage: vi.fn(),
      loadMore: vi.fn(),
      select: vi.fn(),
      deselect: vi.fn(),
      clearSelection: vi.fn(),
      addToInbox: vi.fn(),
      extractWords: vi.fn(),
      extractWordsWithFrequency: vi.fn(),
      processItem: vi.fn(),
      deleteItem: vi.fn(),
      setProcessed: vi.fn(),
      clearProcessed: vi.fn(),
    });
  });

  it('switches to Inbox tab when clicking sidebar button', () => {
    render(<LibraryView />);

    fireEvent.click(screen.getByText('Inbox'));
    expect(screen.getAllByText('Inbox')[0]).toBeInTheDocument();
  });
});
