import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Definition } from '@/types';
import { cn } from '@/lib/utils';

interface DefinitionListProps {
  definitions: Definition[];
  onAddDefinition: (text: string) => void;
  onUpdateDefinition: (id: string, text: string) => void;
  onDeleteDefinition?: (id: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  word?: string;
}

/**
 * List of dictionary definitions with loading states and edit capability
 */
export function DefinitionList({
  definitions,
  onAddDefinition,
  onUpdateDefinition,
  onDeleteDefinition,
  onRefresh,
  isLoading,
  word,
}: DefinitionListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newDefinition, setNewDefinition] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleAdd = () => {
    if (!newDefinition.trim()) return;
    onAddDefinition(newDefinition.trim());
    setNewDefinition('');
    setIsAdding(false);
  };

  const handleEdit = (def: Definition) => {
    setEditingId(def.id);
    setEditingText(def.text);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingText.trim()) return;
    onUpdateDefinition(editingId, editingText.trim());
    setEditingId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this definition?')) {
      onDeleteDefinition?.(id);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Definitions
        </label>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading || !word}
              className="text-xs text-primary hover:text-primary/80 transition-colors disabled:opacity-50 flex items-center gap-1"
              title="Refresh definitions"
            >
              {isLoading ? (
                <>
                  <svg
                    className="w-3 h-3 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    <path d="M21 3v9h-9" />
                  </svg>
                  <span>Refresh</span>
                </>
              )}
            </button>
          )}
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Definitions list */}
      {definitions.length > 0 ? (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {definitions.map((def, index) => (
              <motion.div
                key={def.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'p-3 rounded-md border',
                  def.isCustom ? 'bg-accent/50 border-accent/30' : 'bg-muted/30 border-border'
                )}
              >
                {editingId === def.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="text-xs text-primary hover:text-primary/80"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-medium text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <p className="text-sm text-foreground flex-1">{def.text}</p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(def)}
                          className="p-1 hover:bg-accent rounded transition-colors"
                          title="Edit definition"
                        >
                          <svg
                            className="w-3 h-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(def.id)}
                          className="p-1 hover:bg-destructive/20 text-destructive rounded transition-colors"
                          title="Delete definition"
                        >
                          <svg
                            className="w-3 h-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
                      <span>{def.source}</span>
                      {def.partOfSpeech && (
                        <>
                          <span className="text-muted-foreground/60">•</span>
                          <span>{def.partOfSpeech}</span>
                        </>
                      )}
                      {def.isUserEdited && (
                        <>
                          <span className="text-muted-foreground/60">•</span>
                          <span className="italic">edited</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground italic py-4 text-center">
          No definitions yet. Click "Add" to create a custom definition.
        </div>
      )}

      {/* Add definition form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <textarea
              value={newDefinition}
              onChange={(e) => setNewDefinition(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              placeholder="Enter definition..."
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Add Definition
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewDefinition('');
                }}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
