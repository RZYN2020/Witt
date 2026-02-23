import { useLibraryStore } from '@/stores/useLibraryStore';
import { useCaptureStore } from '@/stores/useCaptureStore';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Library header with search and view toggle
 */
export function LibraryHeader() {
  const { searchQuery, setSearchQuery, viewMode, setViewMode } = useLibraryStore();
  const { openPopup } = useCaptureStore();

  return (
    <header className="h-[57px] border-b border-border bg-card px-6 flex items-center">
      <div className="flex items-center justify-between gap-4 w-full">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards... (Ctrl+F)"
              className="w-full pl-10 pr-4 py-2 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'grid' ? 'bg-background shadow-sm' : 'hover:bg-accent'
              )}
              title="Grid view"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded transition-colors',
                viewMode === 'list' ? 'bg-background shadow-sm' : 'hover:bg-accent'
              )}
              title="List view"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>

          {/* New capture button */}
          <button
            onClick={() =>
              openPopup('Sample context text', {
                type: 'app',
                name: 'Manual',
              })
            }
            className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors"
          >
            + New Capture
          </button>
        </div>
      </div>
    </header>
  );
}
