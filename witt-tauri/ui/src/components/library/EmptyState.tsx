import { useLibraryStore } from '@/stores/useLibraryStore';
import { useCaptureStore } from '@/stores/useCaptureStore';

/**
 * Empty state component for library view
 */
export function EmptyState() {
  const { notes, searchQuery, filter, clearFilters } = useLibraryStore();
  const { openPopup } = useCaptureStore();

  const hasActiveFilters =
    (filter.time_range && filter.time_range !== 'all') || filter.source || searchQuery;

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Start Your Collection</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          You haven't captured any words yet. Start building your personal language asset library!
        </p>
        <button
          onClick={() =>
            openPopup('The bank was steep and muddy.', {
              type: 'video',
              filename: 'demo.mp4',
              timestamp: '00:00:00',
            })
          }
          className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Capture Your First Word
        </button>
        <p className="text-xs text-muted-foreground mt-4">
          Or press Cmd+G to capture from anywhere
        </p>
      </div>
    );
  }

  if (hasActiveFilters) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">No Results Found</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          {searchQuery
            ? `No cards match your search for "${searchQuery}"`
            : 'No cards match the current filters'}
        </p>
        <button
          onClick={clearFilters}
          className="px-6 py-3 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
        >
          Clear Filters
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="text-6xl mb-4">📚</div>
      <h2 className="text-2xl font-bold text-foreground mb-2">No Cards</h2>
      <p className="text-muted-foreground max-w-md">
        No cards match your current view. Try adjusting your filters or capture some new words!
      </p>
    </div>
  );
}
