import { useLibraryStore } from '@/stores/useLibraryStore';
import { formatDate } from '@/lib/utils';
import type { Note, Audio } from '@/types';
import { cn } from '@/lib/utils';

interface CardPreviewProps {
  note: Note;
}

/**
 * Note preview component for grid/list items
 * Displays complete note information according to witt-core types
 */
export function CardPreview({ note }: CardPreviewProps) {
  const { selectedNotes, selectNote } = useLibraryStore();
  const isSelected = selectedNotes.has(note.lemma);

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      selectNote(note.lemma, e.shiftKey);
    } else {
      selectNote(note.lemma, false);
    }
  };

  const getSourceIcon = () => {
    if (!note.contexts.length) return '💻';
    const source = note.contexts[0].source;
    switch (source.type) {
      case 'web':
        return '🌐';
      case 'video':
        return '🎬';
      case 'pdf':
        return '📄';
      case 'app':
        return '💻';
    }
  };

  const getSourceDisplay = () => {
    if (!note.contexts.length) return 'Manual';
    const source = note.contexts[0].source;
    switch (source.type) {
      case 'web':
        return source.title;
      case 'video':
        return `${source.filename} • ${source.timestamp}`;
      case 'pdf':
        return `${source.filename}${source.page ? ` p.${source.page}` : ''}`;
      case 'app':
        return source.name;
    }
  };

  const getPronunciationPath = () => {
    if (!note.pronunciation) return null;
    return typeof note.pronunciation === 'string'
      ? note.pronunciation
      : (note.pronunciation as Audio).file_path;
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'bg-card border rounded-lg p-5 cursor-pointer transition-all duration-200',
        'hover:shadow-lg hover:border-primary/50',
        isSelected
          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary ring-offset-2'
          : 'border-border'
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
      {/* Header: Lemma and Phonetics */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-foreground break-words">{note.lemma}</h3>
            {note.phonetics && (
              <p className="text-sm text-muted-foreground font-mono mt-1">/{note.phonetics}/</p>
            )}
            {note.comment && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{note.comment}</p>
            )}
          </div>
          {getPronunciationPath() && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Play pronunciation audio
                console.log('Play pronunciation:', getPronunciationPath());
              }}
              className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
              title="Play pronunciation"
              aria-label="Play pronunciation"
            >
              <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Definition - Full display */}
      {note.definition && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-foreground leading-relaxed break-words">{note.definition}</p>
        </div>
      )}

      {/* Contexts and Source */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full font-medium">
          {note.contexts.length} context{note.contexts.length !== 1 ? 's' : ''}
        </span>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <span>{getSourceIcon()}</span>
          <span className="truncate max-w-[200px]">{getSourceDisplay()}</span>
        </span>
      </div>

      {/* Contexts Preview */}
      {note.contexts.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Recent Contexts
          </p>
          {note.contexts.slice(0, 2).map((ctx) => (
            <div key={ctx.id} className="p-2 bg-muted/30 rounded text-xs">
              <p className="text-foreground font-medium mb-1">{ctx.word_form}</p>
              <p className="text-muted-foreground line-clamp-2">{ctx.sentence}</p>
            </div>
          ))}
          {note.contexts.length > 2 && (
            <p className="text-xs text-muted-foreground text-center">
              +{note.contexts.length - 2} more contexts
            </p>
          )}
        </div>
      )}

      {/* Tags - Show more */}
      {note.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {note.tags.slice(0, 8).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full"
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 8 && (
            <span className="text-xs px-2.5 py-1 text-muted-foreground">
              +{note.tags.length - 8}
            </span>
          )}
        </div>
      )}

      {/* Footer: Deck, Created, Updated */}
      <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span className="font-medium">{note.deck}</span>
        </span>
        <div className="flex items-center gap-3">
          <span>Created: {formatDate(note.created_at)}</span>
          {note.updated_at && <span>Updated: {formatDate(note.updated_at)}</span>}
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
        </div>
      )}
    </div>
  );
}
