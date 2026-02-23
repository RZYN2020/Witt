/**
 * Centralized error handling for Witt application
 */

/**
 * Error types for different failure scenarios
 */
export enum ErrorType {
  /** Network or IPC communication failure */
  NETWORK = 'NETWORK',
  /** Backend returned an error */
  BACKEND = 'BACKEND',
  /** Validation failed on input */
  VALIDATION = 'VALIDATION',
  /** Unknown or unexpected error */
  UNKNOWN = 'UNKNOWN',
  /** Timeout error */
  TIMEOUT = 'TIMEOUT',
  /** Permission denied */
  PERMISSION = 'PERMISSION',
  /** Resource not found */
  NOT_FOUND = 'NOT_FOUND',
  /** Conflict (e.g., duplicate entry) */
  CONFLICT = 'CONFLICT',
}

/**
 * Standardized error structure
 */
export interface WittError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: unknown;
  timestamp: string;
}

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  [ErrorType.NETWORK]: 'Unable to connect to the backend. Please try again.',
  [ErrorType.BACKEND]: 'An error occurred. Please try again.',
  [ErrorType.VALIDATION]: 'Invalid input. Please check your entries.',
  [ErrorType.TIMEOUT]: 'Request timed out. Please try again.',
  [ErrorType.PERMISSION]: 'Permission denied. Please check your settings.',
  [ErrorType.NOT_FOUND]: 'Resource not found.',
  [ErrorType.CONFLICT]: 'Conflict detected. Please resolve and try again.',
  [ErrorType.UNKNOWN]: 'An unexpected error occurred.',
};

/**
 * Create a standardized error object
 */
export function createError(
  type: ErrorType,
  message: string,
  options?: { code?: string; details?: unknown }
): WittError {
  return {
    type,
    message: message || ERROR_MESSAGES[type],
    code: options?.code,
    details: options?.details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Classify an error from Tauri invoke call
 */
export function classifyError(error: unknown): WittError {
  if (isWittError(error)) return error;

  const errorMessage =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as any).message)
          : (() => {
              try {
                return JSON.stringify(error);
              } catch {
                return String(error);
              }
            })();

  // Network/IPC errors
  if (errorMessage.includes('failed to fetch') || errorMessage.includes('network')) {
    return createError(ErrorType.NETWORK, errorMessage);
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return createError(ErrorType.TIMEOUT, errorMessage);
  }

  // Not found errors
  if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
    return createError(ErrorType.NOT_FOUND, errorMessage);
  }

  // Permission errors
  if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
    return createError(ErrorType.PERMISSION, errorMessage);
  }

  // Conflict errors
  if (
    errorMessage.includes('conflict') ||
    errorMessage.includes('duplicate') ||
    errorMessage.includes('already exists')
  ) {
    return createError(ErrorType.CONFLICT, errorMessage);
  }

  // Validation errors
  if (errorMessage.includes('invalid') || errorMessage.includes('validation')) {
    return createError(ErrorType.VALIDATION, errorMessage);
  }

  // Default to backend error for known Rust errors
  if (error instanceof Error) {
    return createError(ErrorType.BACKEND, errorMessage);
  }

  // Unknown error type
  return createError(ErrorType.UNKNOWN, errorMessage);
}

/**
 * Get user-friendly message for an error
 */
export function getUserFriendlyMessage(error: WittError | unknown): string {
  if (!isWittError(error)) {
    return ERROR_MESSAGES[ErrorType.UNKNOWN];
  }

  // Return specific message if available, otherwise use default for type
  return error.message || ERROR_MESSAGES[error.type];
}

/**
 * Type guard to check if an object is a WittError
 */
function isWittError(error: unknown): error is WittError {
  return typeof error === 'object' && error !== null && 'type' in error && 'message' in error;
}

/**
 * Log error for debugging
 */
export function logError(error: WittError | unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const wittError = isWittError(error) ? error : classifyError(error);

  console.error(`[${timestamp}] Error${context ? ` in ${context}` : ''}:`, {
    type: wittError.type,
    message: wittError.message,
    code: wittError.code,
    details: wittError.details,
  });
}

/**
 * Retry a promise with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  }
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, onRetry } = options || {};

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        onRetry?.(attempt + 1, error);

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Exponential backoff with max delay
        delay = Math.min(delay * 2, maxDelay);
      }
    }
  }

  throw lastError;
}

/**
 * Execute a function with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Request timed out'
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(classifyError(new Error(timeoutMessage))), timeoutMs)
    ),
  ]);
}
