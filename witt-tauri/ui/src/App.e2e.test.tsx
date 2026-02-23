import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useCaptureStore } from '@/stores/useCaptureStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useInboxStore } from '@/stores/useInboxStore';

vi.mock('@/stores/useSettingsStore');
vi.mock('@/stores/useCaptureStore');
vi.mock('@/stores/useLibraryStore');
vi.mock('@/stores/useInboxStore');

vi.mock('./lib/commands', () => ({
  initCore: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
  getCurrentWebviewWindow: () => ({ label: 'main' }),
}));

vi.mock('./components/GlobalShortcuts', () => ({
  GlobalShortcuts: () => null,
}));

vi.mock('./components/ContextMenuHandler', () => ({
  ContextMenuHandler: () => null,
}));

describe('App (e2e smoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useSettingsStore as unknown as vi.Mock).mockReturnValue({
      theme: 'light',
      appLanguage: 'en',
    });

    (useCaptureStore as unknown as vi.Mock).mockReturnValue({
      openPopup: vi.fn(),
    });

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
      loadNotes: vi.fn(),
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
      unprocessedCount: 3,
      currentPage: 0,
      pageSize: 10,
      total: 0,
      searchTerm: '',
      sourceType: null,
      processedFilter: 'unprocessed',
      capturedAfter: null,
      capturedBefore: null,
      selected: new Set(),
      loadItems: vi.fn(),
      refreshUnprocessedCount: vi.fn(),
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

  it('renders main window and can switch to Inbox tab', async () => {
    render(<App />);
    expect(await screen.findByText('Witt')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Inbox'));
    expect(screen.getAllByText('Inbox')[0]).toBeInTheDocument();
  });
});
