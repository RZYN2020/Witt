import { create } from 'zustand';
import type { LoadingIndicator, LoadingState, ProgressInfo } from '@/lib/loading';

interface LoadingStateSlice {
  // Global loading state
  isLoading: boolean;

  // Active loading indicators
  indicators: Map<string, LoadingIndicator>;

  // Current operation progress
  currentProgress: ProgressInfo | null;

  // Actions
  setLoading: (loading: boolean) => void;
  addIndicator: (indicator: LoadingIndicator) => void;
  removeIndicator: (id: string) => void;
  updateIndicator: (id: string, updates: Partial<LoadingIndicator>) => void;
  setProgress: (progress: ProgressInfo | null) => void;
  clearIndicators: () => void;
}

export const useLoadingStore = create<LoadingStateSlice>((set) => ({
  isLoading: false,
  indicators: new Map(),
  currentProgress: null,

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  addIndicator: (indicator) => {
    set((state) => {
      const newIndicators = new Map(state.indicators);
      newIndicators.set(indicator.id, indicator);
      return { indicators: newIndicators };
    });
  },

  removeIndicator: (id) => {
    set((state) => {
      const newIndicators = new Map(state.indicators);
      newIndicators.delete(id);
      return {
        indicators: newIndicators,
        isLoading: newIndicators.size > 0,
      };
    });
  },

  updateIndicator: (id, updates) => {
    set((state) => {
      const newIndicators = new Map(state.indicators);
      const indicator = newIndicators.get(id);
      if (indicator) {
        newIndicators.set(id, { ...indicator, ...updates });
      }
      return { indicators: newIndicators };
    });
  },

  setProgress: (progress) => {
    set({ currentProgress: progress });
  },

  clearIndicators: () => {
    set({
      indicators: new Map(),
      isLoading: false,
      currentProgress: null,
    });
  },
}));

/**
 * Hook for managing loading state of a specific operation
 */
export function useOperationLoading(operationId: string) {
  const addIndicator = useLoadingStore((state) => state.addIndicator);
  const removeIndicator = useLoadingStore((state) => state.removeIndicator);
  const updateIndicator = useLoadingStore((state) => state.updateIndicator);

  const start = (message?: string) => {
    const indicator = {
      id: operationId,
      type: 'loading' as LoadingState,
      message,
      createdAt: Date.now(),
    };
    addIndicator(indicator);
  };

  const update = (updates: Partial<LoadingIndicator>) => {
    updateIndicator(operationId, updates);
  };

  const setProgress = (current: number, total: number, message?: string) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    updateIndicator(operationId, {
      progress: { current, total, percentage, message },
    });
  };

  const success = (message?: string) => {
    updateIndicator(operationId, {
      type: 'success' as LoadingState,
      message: message || 'Completed',
    });
    setTimeout(() => removeIndicator(operationId), 1000);
  };

  const error = (message?: string) => {
    updateIndicator(operationId, {
      type: 'error' as LoadingState,
      message: message || 'Failed',
    });
    setTimeout(() => removeIndicator(operationId), 3000);
  };

  const stop = () => {
    removeIndicator(operationId);
  };

  return { start, update, setProgress, success, error, stop };
}
