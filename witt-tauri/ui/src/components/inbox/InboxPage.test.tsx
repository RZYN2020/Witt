import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InboxPage } from './InboxPage';
import { useInboxStore } from '@/stores/useInboxStore';

vi.mock('@/stores/useInboxStore');

describe('InboxPage', () => {
  const loadItems = vi.fn();
  const refreshUnprocessedCount = vi.fn();
  const setSearchTerm = vi.fn();
  const setSourceType = vi.fn();
  const setProcessedFilter = vi.fn();
  const setCapturedAfter = vi.fn();
  const setCapturedBefore = vi.fn();
  const setPageSize = vi.fn();
  const goToPage = vi.fn();
  const loadMore = vi.fn();
  const select = vi.fn();
  const deselect = vi.fn();
  const clearSelection = vi.fn();
  const deleteItem = vi.fn();
  const setProcessed = vi.fn();
  const clearProcessed = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useInboxStore as unknown as vi.Mock).mockReturnValue({
      items: [
        {
          id: '1',
          context: 'Hello world from Inbox',
          source: { type: 'app', name: 'Test', title: null },
          captured_at: new Date().toISOString(),
          processed: false,
          processing_notes: null,
        },
      ],
      isLoading: false,
      isProcessing: false,
      error: null,
      unprocessedCount: 1,
      currentPage: 0,
      pageSize: 10,
      total: 20,
      searchTerm: 'hello',
      sourceType: null,
      processedFilter: 'unprocessed',
      capturedAfter: null,
      capturedBefore: null,
      selected: new Set(),
      loadItems,
      refreshUnprocessedCount,
      setSearchTerm,
      setSourceType,
      setProcessedFilter,
      setCapturedAfter,
      setCapturedBefore,
      setPageSize,
      goToPage,
      loadMore,
      select,
      deselect,
      clearSelection,
      deleteItem,
      setProcessed,
      clearProcessed,
    });
  });

  it('renders and triggers initial load', () => {
    render(<InboxPage />);
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(loadItems).toHaveBeenCalled();
    expect(refreshUnprocessedCount).toHaveBeenCalled();
  });

  it('highlights search term in context', () => {
    render(<InboxPage />);
    const mark = document.querySelector('mark');
    expect(mark).toBeTruthy();
  });

  it('opens help dialog', () => {
    render(<InboxPage />);
    fireEvent.click(screen.getByText('Help'));
    expect(screen.getByText('Inbox Help')).toBeInTheDocument();
  });

  it('calls loadMore when clicking Load more', () => {
    render(<InboxPage />);
    fireEvent.click(screen.getByText('Load more'));
    expect(loadMore).toHaveBeenCalled();
  });
});

