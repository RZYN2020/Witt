import { useLibraryStore } from '@/stores/useLibraryStore';
import { cn } from '@/lib/utils';

/**
 * Toggle between Notes and Cards display modes
 */
export function ViewModeToggle() {
  const { displayMode, setDisplayMode } = useLibraryStore();

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-md p-1">
      <button
        onClick={() => setDisplayMode('notes')}
        className={cn(
          'px-3 py-1.5 text-xs font-medium rounded transition-colors',
          displayMode === 'notes'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Group by lemma (Notes)"
      >
        📚 Notes
      </button>
      <button
        onClick={() => setDisplayMode('cards')}
        className={cn(
          'px-3 py-1.5 text-xs font-medium rounded transition-colors',
          displayMode === 'cards'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Show individual contexts (Cards)"
      >
        🎴 Cards
      </button>
    </div>
  );
}
