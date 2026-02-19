import { cn } from '@/lib/utils';

interface ActionButtonsProps {
  onSave: () => Promise<string | null>;
  onSaveAndNext: () => Promise<boolean>;
  onDiscard: () => void;
  isLoading: boolean;
  isDisabled: boolean;
}

/**
 * Action buttons for save, save&next, and discard
 */
export function ActionButtons({
  onSave,
  onSaveAndNext,
  onDiscard,
  isLoading,
  isDisabled,
}: ActionButtonsProps) {
  const handleSave = async () => {
    if (isDisabled || isLoading) return;
    await onSave();
  };

  const handleSaveAndNext = async () => {
    if (isDisabled || isLoading) return;
    await onSaveAndNext();
  };

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Discard button */}
      <button
        onClick={onDiscard}
        disabled={isLoading}
        className={cn(
          'px-4 py-2 text-sm rounded-md transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-accent',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        🗑 Discard
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSaveAndNext}
          disabled={isDisabled || isLoading}
          className={cn(
            'px-4 py-2 text-sm rounded-md transition-all',
            'bg-accent text-accent-foreground hover:bg-accent/80',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center gap-2'
          )}
        >
          {isLoading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            '💾'
          )}
          Save & Next
        </button>

        <button
          onClick={handleSave}
          disabled={isDisabled || isLoading}
          className={cn(
            'px-4 py-2 text-sm rounded-md transition-all',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center gap-2 shadow-sm'
          )}
        >
          {isLoading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            '✓'
          )}
          Save & Close
        </button>
      </div>
    </div>
  );
}
