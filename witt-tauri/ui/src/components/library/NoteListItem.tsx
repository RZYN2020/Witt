import { useLibraryStore } from '@/stores/useLibraryStore';
import { formatDate } from '@/lib/utils';
import type { Note } from '@/types';
import { cn } from '@/lib/utils';

interface NoteListItemProps {
  note: Note;
  onClick: () => void;
}

/**
 * Compact note list item showing basic info only
 */
export function NoteListItem({ note, onClick }: NoteListItemProps) {
  const { selectedNotes, selectNote } = useLibraryStore();
  const isSelected = selectedNotes.has(note.lemma);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
        'hover:shadow-md hover:border-primary/50',
        isSelected 
          ? 'border-primary bg-primary/5 shadow-md' 
          : 'border-border bg-card'
      )}
      role="article"
      aria-label={`Note: ${note.lemma}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectNote(note.lemma, false);
        }
      }}
    >
      {/* Lemma and Definition */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-base font-semibold text-foreground truncate">
            {note.lemma}
          </h3>
          {note.contexts.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-medium" title={`${note.contexts.length} context(s)`}>
              {note.contexts.length}
            </span>
          )}
        </div>
        {note.definition && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {note.definition}
          </p>
        )}
      </div>

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex-shrink-0 flex gap-1">
          {note.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded"
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{note.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Deck */}
      <div className="flex-shrink-0 text-xs text-muted-foreground w-24 truncate">
        {note.deck}
      </div>

      {/* Date */}
      <div className="flex-shrink-0 text-xs text-muted-foreground w-20 text-right">
        {formatDate(note.created_at)}
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="flex-shrink-0">
          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </div>
      )}
    </div>
  );
}
