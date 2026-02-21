import { useState, useMemo } from 'react';
import type { Note } from '@/types';
import { cn } from '@/lib/utils';

interface TagManagerProps {
  notes: Note[];
  onDeleteTag: (tag: string) => void;
}

/**
 * Tag management component for organizing notes with tags
 */
export function TagManager({
  notes,
  onDeleteTag,
}: TagManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Collect all unique tags and their counts
  const tagStats = useMemo(() => {
    const stats = new Map<string, number>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        stats.set(tag, (stats.get(tag) || 0) + 1);
      });
    });
    return Array.from(stats.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [notes]);

  // Filter tags by search query
  const filteredTags = tagStats.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="tag-manager space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Tags ({tagStats.length})
        </h3>
      </div>

      {/* Search */}
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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tags..."
          className="w-full pl-10 pr-3 py-2 bg-muted border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Tags Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {filteredTags.map((tag) => (
          <TagItem
            key={tag.name}
            name={tag.name}
            count={tag.count}
            isSelected={selectedTag === tag.name}
            onSelect={() => setSelectedTag(tag.name === selectedTag ? null : tag.name)}
            onDelete={() => onDeleteTag(tag.name)}
          />
        ))}
      </div>

      {filteredTags.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          <p>{searchQuery ? 'No tags found' : 'No tags yet'}</p>
        </div>
      )}
    </div>
  );
}

interface TagItemProps {
  name: string;
  count: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function TagItem({ name, count, isSelected, onSelect, onDelete }: TagItemProps) {
  return (
    <div
      className={cn(
        'tag-item p-3 rounded-lg border transition-all cursor-pointer',
        isSelected
          ? 'border-primary bg-primary/10'
          : 'border-border bg-card hover:border-primary/50'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{count} note{count !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-destructive/20 text-destructive rounded"
            title="Delete tag"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
