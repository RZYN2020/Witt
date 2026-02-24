import { create } from 'zustand';
import type { InboxItem, Source } from '@/types';
import * as commands from '@/lib/commands';
import { useToastStore } from './useToastStore';
import { useLoadingStore } from './useLoadingStore';
import { useLibraryStore } from './useLibraryStore';
import { classifyError, getUserFriendlyMessage, logError } from '@/lib/errors';
import { withLoading, LoadingState } from '@/lib/loading';

interface InboxSlice {
  items: InboxItem[];
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;

  unprocessedCount: number;

  currentPage: number;
  pageSize: number;
  total: number;

  searchTerm: string;
  sourceType: string | null;
  processedFilter: 'unprocessed' | 'all' | 'processed';
  capturedAfter: string | null;
  capturedBefore: string | null;

  selected: Set<string>;

  loadItems: (opts?: { page?: number }) => Promise<void>;
  refreshUnprocessedCount: () => Promise<void>;
  setSearchTerm: (term: string) => void;
  setSourceType: (sourceType: string | null) => void;
  setProcessedFilter: (filter: 'unprocessed' | 'all' | 'processed') => void;
  setCapturedAfter: (iso: string | null) => void;
  setCapturedBefore: (iso: string | null) => void;
  setPageSize: (pageSize: number) => void;
  goToPage: (page: number) => Promise<void>;
  loadMore: () => Promise<void>;

  select: (id: string, multi?: boolean) => void;
  deselect: (id: string) => void;
  clearSelection: () => void;

  addToInbox: (context: string, source: Source) => Promise<void>;
  extractWords: (context: string) => Promise<string[]>;
  extractWordsWithFrequency: (context: string) => Promise<Array<{ word: string; count: number }>>;
  processItem: (itemId: string, lemmas: string[]) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  setProcessed: (itemId: string, processed: boolean, notes?: string) => Promise<void>;
  clearProcessed: () => Promise<void>;
}

export const useInboxStore = create<InboxSlice>((set, get) => ({
  items: [],
  isLoading: false,
  isProcessing: false,
  error: null,

  unprocessedCount: 0,

  currentPage: 0,
  pageSize: 10,
  total: 0,

  searchTerm: '',
  sourceType: null,
  processedFilter: 'unprocessed',
  capturedAfter: null,
  capturedBefore: null,

  selected: new Set(),

  refreshUnprocessedCount: async () => {
    try {
      const count = await commands.getInboxCount(false);
      set({ unprocessedCount: count });
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'getInboxCount');
    }
  },

  loadItems: async (opts?: { page?: number }) => {
    const page = opts?.page ?? get().currentPage;
    const { pageSize, searchTerm, sourceType, processedFilter, capturedAfter, capturedBefore } = get();

    set({ isLoading: true, error: null });
    useLoadingStore.getState().setLoading(true);

    try {
      const resp = await withLoading(
        async () => {
          const processed =
            processedFilter === 'all' ? undefined : processedFilter === 'processed' ? true : false;
          return commands.getInboxItems(
            page,
            pageSize,
            searchTerm || undefined,
            sourceType || undefined,
            processed,
            capturedAfter || undefined,
            capturedBefore || undefined
          );
        },
        { minDisplayTime: 150 }
      );

      set({
        items: resp.items,
        total: resp.total,
        currentPage: resp.page,
        pageSize: resp.page_size,
        isLoading: false,
      });
      void get().refreshUnprocessedCount();
      useLoadingStore.getState().setLoading(false);
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'loadInboxItems');
      const userMessage = getUserFriendlyMessage(classifiedError);

      set({ isLoading: false, error: userMessage });
      useLoadingStore.getState().setLoading(false);
      useToastStore.getState().addToast({
        message: userMessage,
        type: 'error',
        duration: 4000,
      });
    }
  },

  setSearchTerm: (term: string) => {
    set({ searchTerm: term, currentPage: 0 });
    void useInboxStore.getState().loadItems({ page: 0 });
  },

  setSourceType: (sourceType: string | null) => {
    set({ sourceType, currentPage: 0 });
    void useInboxStore.getState().loadItems({ page: 0 });
  },

  setProcessedFilter: (filter) => {
    set({ processedFilter: filter, currentPage: 0 });
    void useInboxStore.getState().loadItems({ page: 0 });
  },

  setCapturedAfter: (iso) => {
    set({ capturedAfter: iso, currentPage: 0 });
    void useInboxStore.getState().loadItems({ page: 0 });
  },

  setCapturedBefore: (iso) => {
    set({ capturedBefore: iso, currentPage: 0 });
    void useInboxStore.getState().loadItems({ page: 0 });
  },

  setPageSize: (pageSize: number) => {
    const clamped = Math.max(1, Math.min(100, pageSize));
    set({ pageSize: clamped, currentPage: 0 });
    void useInboxStore.getState().loadItems({ page: 0 });
  },

  goToPage: async (page: number) => {
    const p = Math.max(0, page);
    await get().loadItems({ page: p });
  },

  loadMore: async () => {
    const {
      isLoading,
      currentPage,
      pageSize,
      total,
      searchTerm,
      sourceType,
      processedFilter,
      capturedAfter,
      capturedBefore,
    } = get();
    if (isLoading) return;
    if ((currentPage + 1) * pageSize >= total) return;

    set({ isLoading: true, error: null });
    try {
      const processed =
        processedFilter === 'all' ? undefined : processedFilter === 'processed' ? true : false;
      const resp = await commands.getInboxItems(
        currentPage + 1,
        pageSize,
        searchTerm || undefined,
        sourceType || undefined,
        processed,
        capturedAfter || undefined,
        capturedBefore || undefined
      );

      set((state) => ({
        items: [...state.items, ...resp.items],
        total: resp.total,
        currentPage: resp.page,
        pageSize: resp.page_size,
        isLoading: false,
      }));
      void get().refreshUnprocessedCount();
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'loadMoreInboxItems');
      const userMessage = getUserFriendlyMessage(classifiedError);
      set({ isLoading: false, error: userMessage });
      useToastStore.getState().addToast({
        message: userMessage,
        type: 'error',
        duration: 4000,
      });
    }
  },

  select: (id: string, multi?: boolean) => {
    set((state) => {
      const next = new Set(multi ? state.selected : []);
      next.add(id);
      return { selected: next };
    });
  },

  deselect: (id: string) => {
    set((state) => {
      const next = new Set(state.selected);
      next.delete(id);
      return { selected: next };
    });
  },

  clearSelection: () => set({ selected: new Set() }),

  addToInbox: async (context: string, source: Source) => {
    const trimmed = context.trim();
    if (!trimmed) {
      useToastStore.getState().addToast({
        message: 'Context is required',
        type: 'error',
        duration: 3000,
      });
      return;
    }

    const operationId = 'add-to-inbox';
    useLoadingStore.getState().addIndicator({
      id: operationId,
      type: LoadingState.LOADING,
      message: 'Saving to Inbox...',
      createdAt: Date.now(),
    });

    try {
      await commands.addToInbox(trimmed, source);
      useLoadingStore.getState().removeIndicator(operationId);
      useToastStore.getState().addToast({
        message: 'Saved to Inbox',
        type: 'success',
        duration: 2000,
      });
      await get().loadItems({ page: 0 });
      void get().refreshUnprocessedCount();
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'addToInbox');
      const userMessage = getUserFriendlyMessage(classifiedError);

      useLoadingStore.getState().updateIndicator(operationId, {
        type: LoadingState.ERROR,
        message: userMessage,
      });
      useToastStore.getState().addToast({
        message: userMessage,
        type: 'error',
        duration: 4000,
      });
    }
  },

  extractWords: async (context: string) => {
    try {
      return await commands.extractWords(context);
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'extractWords');
      const userMessage = getUserFriendlyMessage(classifiedError);
      useToastStore.getState().addToast({
        message: userMessage,
        type: 'error',
        duration: 4000,
      });
      return [];
    }
  },

  extractWordsWithFrequency: async (context: string) => {
    try {
      const pairs = await commands.extractWordsWithFrequency(context);
      return pairs.map(([word, count]) => ({ word, count }));
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'extractWordsWithFrequency');
      const userMessage = getUserFriendlyMessage(classifiedError);
      useToastStore.getState().addToast({
        message: userMessage,
        type: 'error',
        duration: 4000,
      });
      return [];
    }
  },

  processItem: async (itemId: string, lemmas: string[]) => {
    set({ isProcessing: true });
    const operationId = `process-${itemId}`;
    useLoadingStore.getState().addIndicator({
      id: operationId,
      type: LoadingState.LOADING,
      message: 'Processing...',
      createdAt: Date.now(),
    });

    try {
      await commands.processInboxItem(itemId, lemmas);
      useLoadingStore.getState().removeIndicator(operationId);
      set({ isProcessing: false });
      useToastStore.getState().addToast({
        message: 'Processed',
        type: 'success',
        duration: 2000,
      });
      await Promise.all([get().loadItems(), useLibraryStore.getState().loadNotes()]);
      void get().refreshUnprocessedCount();
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'processInboxItem');
      const userMessage = getUserFriendlyMessage(classifiedError);

      useLoadingStore.getState().updateIndicator(operationId, {
        type: LoadingState.ERROR,
        message: userMessage,
      });
      set({ isProcessing: false, error: userMessage });
      useToastStore.getState().addToast({
        message: userMessage,
        type: 'error',
        duration: 4000,
      });
    }
  },

  deleteItem: async (itemId: string) => {
    const operationId = `delete-${itemId}`;
    useLoadingStore.getState().addIndicator({
      id: operationId,
      type: LoadingState.LOADING,
      message: 'Deleting...',
      createdAt: Date.now(),
    });

    try {
      await commands.deleteInboxItem(itemId);
      useLoadingStore.getState().removeIndicator(operationId);
      useToastStore.getState().addToast({
        message: 'Deleted',
        type: 'success',
        duration: 2000,
      });
      await get().loadItems();
      void get().refreshUnprocessedCount();
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'deleteInboxItem');
      const userMessage = getUserFriendlyMessage(classifiedError);
      useLoadingStore.getState().updateIndicator(operationId, {
        type: LoadingState.ERROR,
        message: userMessage,
      });
      useToastStore.getState().addToast({
        message: userMessage,
        type: 'error',
        duration: 4000,
      });
    }
  },

  setProcessed: async (itemId: string, processed: boolean, notes?: string) => {
    const operationId = `set-processed-${itemId}`;
    useLoadingStore.getState().addIndicator({
      id: operationId,
      type: LoadingState.LOADING,
      message: processed ? 'Marking processed...' : 'Restoring...',
      createdAt: Date.now(),
    });

    try {
      await commands.setInboxItemProcessed(itemId, processed, notes);
      useLoadingStore.getState().removeIndicator(operationId);
      await get().loadItems();
      void get().refreshUnprocessedCount();
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'setInboxItemProcessed');
      const userMessage = getUserFriendlyMessage(classifiedError);
      useLoadingStore.getState().updateIndicator(operationId, {
        type: LoadingState.ERROR,
        message: userMessage,
      });
      useToastStore.getState().addToast({
        message: userMessage,
        type: 'error',
        duration: 4000,
      });
    }
  },

  clearProcessed: async () => {
    const operationId = 'clear-processed-inbox';
    useLoadingStore.getState().addIndicator({
      id: operationId,
      type: LoadingState.LOADING,
      message: 'Clearing processed...',
      createdAt: Date.now(),
    });

    try {
      await commands.clearProcessedInboxItems();
      useLoadingStore.getState().removeIndicator(operationId);
      useToastStore.getState().addToast({
        message: 'Cleared processed',
        type: 'success',
        duration: 2000,
      });
      await get().loadItems({ page: 0 });
      void get().refreshUnprocessedCount();
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'clearProcessedInboxItems');
      const userMessage = getUserFriendlyMessage(classifiedError);
      useLoadingStore.getState().updateIndicator(operationId, {
        type: LoadingState.ERROR,
        message: userMessage,
      });
      useToastStore.getState().addToast({
        message: userMessage,
        type: 'error',
        duration: 4000,
      });
    }
  },
}));
