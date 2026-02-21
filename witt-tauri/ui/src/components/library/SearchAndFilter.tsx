import React, { useState, useCallback } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { NoteFilter, TimeRange } from '@/types';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  className?: string;
}

/**
 * Search bar component for filtering notes
 */
export function SearchBar({ className }: SearchBarProps) {
  const { searchQuery, setSearchQuery } = useLibraryStore();
  const [localValue, setLocalValue] = useState(searchQuery);

  // Debounced search
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalValue(value);
    
    // Debounce search by 300ms
    const timeoutId = setTimeout(() => {
      setSearchQuery(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [setSearchQuery]);

  const handleClear = () => {
    setLocalValue('');
    setSearchQuery('');
  };

  return (
    <div className={cn('search-bar relative', className)}>
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder="Search notes, contexts, tags..."
          className="w-full pl-10 pr-10 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          aria-label="Search notes"
        />
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded"
            aria-label="Clear search"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface FilterBarProps {
  className?: string;
}

/**
 * Filter bar component for time range and other filters
 */
export function FilterBar({ className }: FilterBarProps) {
  const { filter, setFilter, clearFilters } = useLibraryStore();

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'this_week', label: 'This Week' },
    { value: 'this_month', label: 'This Month' },
  ];

  const handleTimeRangeChange = (value: TimeRange) => {
    setFilter({ time_range: value === 'all' ? undefined : value });
  };

  const hasActiveFilters = filter.time_range !== undefined && filter.time_range !== 'all';

  return (
    <div className={cn('filter-bar flex items-center gap-3', className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Filter:</span>
        {timeRanges.map((range) => (
          <button
            key={range.value}
            onClick={() => handleTimeRangeChange(range.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              (filter.time_range || 'all') === range.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {range.label}
          </button>
        ))}
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

interface SortDropdownProps {
  className?: string;
}

/**
 * Sort dropdown component
 */
export function SortDropdown({ className }: SortDropdownProps) {
  const [sortBy, setSortBy] = useState<'created_at' | 'lemma' | 'context_count'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  return (
    <div className={cn('sort-dropdown relative', className)}>
      <select
        value={`${sortBy}-${sortOrder}`}
        onChange={(e) => {
          const [newSortBy, newSortOrder] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder];
          setSortBy(newSortBy);
          setSortOrder(newSortOrder);
        }}
        className="px-3 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label="Sort notes"
      >
        <option value="created_at-desc">Newest First</option>
        <option value="created_at-asc">Oldest First</option>
        <option value="lemma-asc">Lemma (A-Z)</option>
        <option value="lemma-desc">Lemma (Z-A)</option>
        <option value="context_count-desc">Most Contexts</option>
        <option value="context_count-asc">Fewest Contexts</option>
      </select>
    </div>
  );
}

interface ViewToggleProps {
  className?: string;
}

/**
 * View toggle component for grid/list view switching
 */
export function ViewToggle({ className }: ViewToggleProps) {
  const { viewMode, setViewMode } = useLibraryStore();

  return (
    <div className={cn('view-toggle flex items-center gap-1', className)}>
      <button
        onClick={() => setViewMode('grid')}
        className={cn(
          'p-2 rounded transition-colors',
          viewMode === 'grid'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent text-muted-foreground'
        )}
        aria-label="Grid view"
        aria-pressed={viewMode === 'grid'}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          viewMode === 'list'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-accent text-muted-foreground'
        )}
        aria-label="List view"
        aria-pressed={viewMode === 'list'}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </button>
    </div>
  );
}

interface FilterChipsProps {
  className?: string;
}

/**
 * Filter chips component showing active filters
 */
export function FilterChips({ className }: FilterChipsProps) {
  const { filter, setFilter } = useLibraryStore();

  const removeFilter = (filterType: keyof NoteFilter) => {
    if (filterType === 'time_range') {
      setFilter({ time_range: undefined });
    } else if (filterType === 'tags') {
      setFilter({ tags: undefined });
    } else if (filterType === 'search_query') {
      // Search is handled separately
    }
  };

  const activeFilters: Array<{ type: keyof NoteFilter; label: string }> = [];

  if (filter.time_range && filter.time_range !== 'all') {
    activeFilters.push({
      type: 'time_range',
      label: `Time: ${filter.time_range.replace('_', ' ')}`,
    });
  }

  if (filter.tags && filter.tags.length > 0) {
    filter.tags.forEach((tag) => {
      activeFilters.push({
        type: 'tags',
        label: `Tag: ${tag}`,
      });
    });
  }

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className={cn('filter-chips flex items-center gap-2 flex-wrap', className)}>
      <span className="text-sm text-muted-foreground">Active filters:</span>
      {activeFilters.map((filter, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs"
        >
          {filter.label}
          <button
            onClick={() => removeFilter(filter.type)}
            className="hover:text-destructive"
            aria-label={`Remove ${filter.label} filter`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
    </div>
  );
}
