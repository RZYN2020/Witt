/**
 * Loading states and progress indicators for Witt application
 */

/**
 * Loading state types
 */
export enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

/**
 * Progress information for operations
 */
export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  message?: string;
}

/**
 * Loading indicator state
 */
export interface LoadingIndicator {
  id: string;
  type: LoadingState;
  progress?: ProgressInfo;
  message?: string;
  createdAt: number;
}

/**
 * Create a progress info object
 */
export function createProgress(current: number, total: number, message?: string): ProgressInfo {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  return {
    current,
    total,
    percentage,
    message,
  };
}

/**
 * Create a loading indicator
 */
export function createLoadingIndicator(
  type: LoadingState,
  message?: string,
  progress?: ProgressInfo
): LoadingIndicator {
  return {
    id: crypto.randomUUID(),
    type,
    message,
    progress,
    createdAt: Date.now(),
  };
}

/**
 * Format progress as human-readable string
 */
export function formatProgress(progress: ProgressInfo): string {
  const base = `${progress.current}/${progress.total} (${progress.percentage}%)`;
  return progress.message ? `${progress.message}: ${base}` : base;
}

/**
 * Estimate remaining time based on progress
 */
export function estimateRemainingTime(
  progress: ProgressInfo,
  elapsedMs: number
): number | null {
  if (progress.current === 0 || progress.percentage === 100) {
    return null;
  }

  const timePerItem = elapsedMs / progress.current;
  const remainingItems = progress.total - progress.current;
  return Math.round(timePerItem * remainingItems);
}

/**
 * Format time in human-readable format
 */
export function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Delay utility for debouncing loading states
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a function with a loading state and minimum display time
 * This prevents flickering for fast operations
 */
export async function withLoading<T>(
  fn: () => Promise<T>,
  options?: {
    minDisplayTime?: number;
  }
): Promise<T> {
  const { minDisplayTime = 300 } = options || {};
  const startTime = Date.now();

  try {
    const result = await fn();

    // Ensure minimum display time
    const elapsed = Date.now() - startTime;
    if (elapsed < minDisplayTime) {
      await delay(minDisplayTime - elapsed);
    }

    return result;
  } catch (error) {
    // Still ensure minimum display time for errors
    const elapsed = Date.now() - startTime;
    if (elapsed < minDisplayTime) {
      await delay(minDisplayTime - elapsed);
    }
    throw error;
  }
}

/**
 * Create a progress tracker class for complex operations
 */
export class ProgressTracker {
  private current: number = 0;
  private total: number;
  private message?: string;
  private onProgress?: (progress: ProgressInfo) => void;
  private startTime: number;

  constructor(
    total: number,
    message?: string,
    onProgress?: (progress: ProgressInfo) => void
  ) {
    this.total = total;
    this.message = message;
    this.onProgress = onProgress;
    this.startTime = Date.now();
  }

  /**
   * Update progress
   */
  update(increment: number = 1, message?: string): void {
    this.current += increment;
    if (message) {
      this.message = message;
    }
    this.notify();
  }

  /**
   * Set absolute progress
   */
  setProgress(current: number, message?: string): void {
    this.current = current;
    if (message) {
      this.message = message;
    }
    this.notify();
  }

  /**
   * Get current progress info
   */
  getProgress(): ProgressInfo {
    return createProgress(this.current, this.total, this.message);
  }

  /**
   * Check if complete
   */
  isComplete(): boolean {
    return this.current >= this.total;
  }

  /**
   * Get estimated remaining time
   */
  getEstimatedRemainingTime(): number | null {
    const elapsed = Date.now() - this.startTime;
    return estimateRemainingTime(this.getProgress(), elapsed);
  }

  private notify(): void {
    if (this.onProgress) {
      this.onProgress(this.getProgress());
    }
  }
}
