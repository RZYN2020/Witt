import { useLibraryStore } from '@/stores/useLibraryStore';
import { cn } from '@/lib/utils';

/**
 * Filter notes by deck
 */
export function DeckFilter() {
  const { deckFilter, setDeckFilter, getDecks } = useLibraryStore();
  const decks = getDecks();

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs font-medium text-muted-foreground">Deck:</label>
      <select
        value={deckFilter}
        onChange={(e) => setDeckFilter(e.target.value as string | 'all')}
        className={cn(
          'px-3 py-1.5 text-xs rounded-md border border-input bg-background',
          'text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          'cursor-pointer'
        )}
        title="Filter by deck"
      >
        <option value="all">All Decks</option>
        {decks.map((deck: string) => (
          <option key={deck} value={deck}>
            {deck}
          </option>
        ))}
      </select>
    </div>
  );
}
