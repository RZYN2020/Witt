import type { Note } from '@/types';
import { ContextDetail } from './ContextDetail';
import { cn } from '@/lib/utils';

interface NoteDetailProps {
  note: Note;
  onClose?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddContext?: () => void;
  onEditContext?: (contextId: string) => void;
  onDeleteContext?: (contextId: string) => void;
}

/**
 * Note detail view component
 * Shows full Note information with all Contexts
 */
export function NoteDetail({
  note,
  onClose,
  onEdit,
  onDelete,
  onAddContext,
  onEditContext,
  onDeleteContext,
}: NoteDetailProps) {
  const contextCount = note.contexts.length;
  const hasEmptySlots = contextCount < 5;

  return (
    <div className="note-detail fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative h-full flex flex-col bg-card">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{note.lemma}</h1>
              {note.phonetics && (
                <p className="text-sm text-muted-foreground font-mono">{note.phonetics}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Note Definition */}
            <section className="note-definition space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Definition
              </h2>
              <p className="text-lg text-foreground leading-relaxed">{note.definition}</p>
            </section>

            {/* Pronunciation */}
            {note.pronunciation && (
              <section className="note-pronunciation space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Pronunciation
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                    aria-label="Play pronunciation"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <span className="text-sm text-muted-foreground">Click to play</span>
                </div>
              </section>
            )}

            {/* Tags */}
            {note.tags.length > 0 && (
              <section className="note-tags space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {note.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 text-sm bg-secondary text-secondary-foreground rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Comment */}
            {note.comment && (
              <section className="note-comment space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Notes
                </h2>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-foreground whitespace-pre-wrap">{note.comment}</p>
                </div>
              </section>
            )}

            {/* Deck Info */}
            <section className="note-deck space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Deck
              </h2>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
                <span className="text-foreground">{note.deck}</span>
              </div>
            </section>

            {/* Contexts Section */}
            <section className="note-contexts space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Contexts
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {contextCount} / 5 slots used
                  </span>
                  {hasEmptySlots && onAddContext && (
                    <button
                      onClick={onAddContext}
                      className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                    >
                      + Add Context
                    </button>
                  )}
                </div>
              </div>

              {/* Context Progress Bar */}
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-2 flex-1 rounded-full transition-colors',
                      i < contextCount ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                ))}
              </div>

              {/* Contexts List */}
              <div className="space-y-3">
                {note.contexts.map((context, index) => (
                  <ContextDetail
                    key={context.id}
                    context={context}
                    index={index}
                    totalCount={contextCount}
                    onEdit={() => onEditContext?.(context.id)}
                    onDelete={() => onDeleteContext?.(context.id)}
                    isEditable={true}
                  />
                ))}

                {contextCount === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    <p>No contexts added yet</p>
                    {hasEmptySlots && onAddContext && (
                      <button
                        onClick={onAddContext}
                        className="mt-3 text-primary hover:underline"
                      >
                        Add your first context
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Metadata */}
            <section className="note-metadata pt-6 border-t border-border">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {formatDate(note.created_at)}
                </div>
                {note.updated_at && (
                  <div>
                    <span className="font-medium">Updated:</span>{' '}
                    {formatDate(note.updated_at)}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
