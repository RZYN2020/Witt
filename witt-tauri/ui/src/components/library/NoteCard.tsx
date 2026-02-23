import type { Note, Context } from '@/types';
import { cn } from '@/lib/utils';

interface NoteCardProps {
  note: Note;
  isSelected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  viewMode?: 'grid' | 'list';
}

/**
 * Note card component displaying Note-Context relationship
 * Shows the lemma as primary with context previews
 */
export function NoteCard({
  note,
  isSelected = false,
  onClick,
  onDelete,
  viewMode = 'grid',
}: NoteCardProps) {
  const contextCount = note.contexts.length;
  const maxPreviewContexts = viewMode === 'grid' ? 2 : 3;
  const previewContexts = note.contexts.slice(0, maxPreviewContexts);
  const remainingContexts = contextCount - maxPreviewContexts;

  return (
    <div
      className={cn(
        'note-card border rounded-lg p-4 cursor-pointer transition-all',
        'hover:shadow-md hover:border-primary/50',
        isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card',
        viewMode === 'list' ? 'flex gap-4' : 'flex flex-col'
      )}
      onClick={onClick}
      role="article"
      aria-label={`Note: ${note.lemma}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Note Header - Lemma and Definition */}
      <div className={cn('note-header', viewMode === 'list' ? 'flex-1' : '')}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">{note.lemma}</h3>
            {note.phonetics && (
              <p className="text-sm text-muted-foreground font-mono">{note.phonetics}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {note.pronunciation && (
              <button
                className="p-2 hover:bg-accent rounded-full transition-colors"
                title="Play pronunciation"
                aria-label="Play pronunciation"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 hover:bg-destructive/20 text-destructive rounded-full transition-colors"
                title="Delete note"
                aria-label="Delete note"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{note.definition}</p>

        {/* Tags */}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {note.tags.slice(0, 5).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-full"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 5 && (
              <span className="px-2 py-0.5 text-xs text-muted-foreground">
                +{note.tags.length - 5}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Contexts Preview */}
      <div className={cn('contexts-section', viewMode === 'list' ? 'w-48 flex-shrink-0' : '')}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Contexts
          </span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {contextCount}
          </span>
        </div>

        <div className="space-y-2">
          {previewContexts.map((context) => (
            <ContextPreview key={context.id} context={context} />
          ))}

          {remainingContexts > 0 && (
            <div className="text-xs text-muted-foreground text-center py-1 bg-muted/50 rounded">
              +{remainingContexts} more context{remainingContexts > 1 ? 's' : ''}
            </div>
          )}

          {contextCount === 0 && (
            <p className="text-xs text-muted-foreground italic py-2">No contexts added yet</p>
          )}
        </div>
      </div>

      {/* Note Footer - Deck and metadata */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">{note.deck}</span>
        <span className="text-xs text-muted-foreground">{formatDate(note.created_at)}</span>
      </div>
    </div>
  );
}

interface ContextPreviewProps {
  context: Context;
}

/**
 * Context preview component showing context summary
 */
function ContextPreview({ context }: ContextPreviewProps) {
  const hasMedia = context.audio || context.image;

  return (
    <div className="context-preview p-2 bg-muted/50 rounded text-xs space-y-1" role="listitem">
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{context.word_form}</span>
        {hasMedia && (
          <div className="flex items-center gap-1">
            {context.audio && (
              <span className="text-muted-foreground" title="Has audio">
                🔊
              </span>
            )}
            {context.image && (
              <span className="text-muted-foreground" title="Has image">
                🖼️
              </span>
            )}
          </div>
        )}
      </div>
      <p className="text-muted-foreground line-clamp-2">{context.sentence}</p>
      {context.source && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <SourceIcon sourceType={context.source.type} />
          <span className="truncate max-w-[100px]">{getSourceLabel(context.source)}</span>
        </div>
      )}
    </div>
  );
}

interface SourceIconProps {
  sourceType: string;
}

function SourceIcon({ sourceType }: SourceIconProps) {
  switch (sourceType) {
    case 'web':
      return (
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'video':
      return (
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      );
    case 'pdf':
      return (
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'app':
      return (
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      );
    default:
      return null;
  }
}

function getSourceLabel(source: Context['source']): string {
  switch (source.type) {
    case 'web':
      return source.title || new URL(source.url).hostname;
    case 'video':
      return source.filename;
    case 'pdf':
      return source.filename;
    case 'app':
      return source.name;
    default:
      return 'Unknown';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} weeks ago`;
  } else if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)} months ago`;
  } else {
    return `${Math.floor(diffDays / 365)} years ago`;
  }
}
