import { useLibraryStore } from '@/stores/useLibraryStore';
import { X } from 'lucide-react';

/**
 * Filter badge display with clear functionality
 */
export function FilterBadges() {
  const { filter, clearFilters } = useLibraryStore();

  const badges: Array<{ id: string; label: string }> = [];

  if (filter.timeRange && filter.timeRange !== 'all') {
    const labels: Record<string, string> = {
      today: 'Today',
      this_week: 'This Week',
      this_month: 'This Month',
    };
    badges.push({ id: 'timeRange', label: labels[filter.timeRange] });
  }

  if (filter.source) {
    badges.push({ id: 'source', label: filter.source });
  }

  if (filter.tags && filter.tags.length > 0) {
    filter.tags.forEach((tag) => {
      badges.push({ id: `tag-${tag}`, label: tag });
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-6 py-3 bg-muted/30 border-b border-border">
      <span className="text-xs text-muted-foreground">Active filters:</span>
      <div className="flex items-center gap-2 flex-wrap">
        {badges.map((badge) => (
          <span
            key={badge.id}
            className="inline-flex items-center gap-1 px-2 py-1 bg-accent text-accent-foreground text-xs rounded-md"
          >
            {badge.label}
          </span>
        ))}
        <button
          onClick={clearFilters}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          Clear all
        </button>
      </div>
    </div>
  );
}
