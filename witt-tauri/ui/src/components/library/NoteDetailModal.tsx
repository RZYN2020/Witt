import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit, Trash2, Plus } from 'lucide-react';
import type { Note } from '@/types';
import { ContextDetail } from './ContextDetail';

interface NoteDetailModalProps {
  note: Note;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddContext?: () => void;
  onEditContext?: (contextId: string) => void;
  onDeleteContext?: (contextId: string) => void;
}

/**
 * Modal showing complete note details
 */
export function NoteDetailModal({
  note,
  onClose,
  onEdit,
  onDelete,
  onAddContext,
  onEditContext,
  onDeleteContext,
}: NoteDetailModalProps) {

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
      >
        <div 
          className="w-full max-w-3xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
            <div>
              <h2 className="text-2xl font-bold text-foreground">{note.lemma}</h2>
              {note.phonetics && (
                <p className="text-sm text-muted-foreground font-mono mt-1">
                  /{note.phonetics}/
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                  title="Edit note"
                >
                  <Edit className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-2 hover:bg-destructive/20 text-destructive rounded-lg transition-colors"
                  title="Delete note"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Definition */}
            <section>
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                Definition
              </h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-base text-foreground leading-relaxed">
                  {note.definition}
                </p>
              </div>
            </section>

            {/* Comment */}
            {note.comment && (
              <section>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                  Notes
                </h3>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {note.comment}
                  </p>
                </div>
              </section>
            )}

            {/* Tags */}
            {note.tags.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-sm px-3 py-1 bg-secondary text-secondary-foreground rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Contexts */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Contexts ({note.contexts.length}/5)
                </h3>
                {onAddContext && note.contexts.length < 5 && (
                  <button
                    onClick={onAddContext}
                    className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Context</span>
                  </button>
                )}
              </div>

              {note.contexts.length > 0 ? (
                <div className="space-y-3">
                  {note.contexts.map((context, index) => (
                    <ContextDetail
                      key={context.id}
                      context={context}
                      index={index}
                      totalCount={note.contexts.length}
                      onEdit={() => onEditContext?.(context.id)}
                      onDelete={() => onDeleteContext?.(context.id)}
                      isEditable={true}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                  <p>No contexts yet</p>
                  {onAddContext && (
                    <button
                      onClick={onAddContext}
                      className="mt-2 text-sm text-primary hover:underline"
                    >
                      Add your first context
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Metadata */}
            <section className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Deck:</span> {note.deck}
                </div>
                <div>
                  <span className="font-medium text-foreground">Created:</span> {new Date(note.created_at).toLocaleString()}
                </div>
                {note.updated_at && (
                  <div>
                    <span className="font-medium text-foreground">Updated:</span> {new Date(note.updated_at).toLocaleString()}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
