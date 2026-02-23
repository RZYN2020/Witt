import { useState } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { Note } from '@/types';
import { ContextDetail } from './ContextDetail';

interface CardDetailProps {
  note: Note;
  onClose: () => void;
}

export function CardDetail({ note, onClose }: CardDetailProps) {
  const { deleteNote } = useLibraryStore();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete note "${note.lemma}"?`)) return;

    setIsDeleting(true);
    await deleteNote(note.lemma);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">{note.lemma}</h2>
            {note.phonetics && (
              <p className="text-sm text-muted-foreground font-mono">{note.phonetics}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-accent rounded transition-colors">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Definition</h3>
            <p className="text-foreground">{note.definition}</p>
          </div>

          {note.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {note.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-xs bg-secondary text-secondary-foreground rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {note.comment && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-foreground whitespace-pre-wrap">{note.comment}</p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Contexts ({note.contexts.length}/5)
            </h3>
            <div className="space-y-3">
              {note.contexts.map((context, index) => (
                <ContextDetail
                  key={context.id}
                  context={context}
                  index={index}
                  totalCount={note.contexts.length}
                  isEditable={false}
                />
              ))}
              {note.contexts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No contexts added yet
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          Created: {new Date(note.created_at).toLocaleString()}
          {note.updated_at && (
            <span className="ml-4">Updated: {new Date(note.updated_at).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}
