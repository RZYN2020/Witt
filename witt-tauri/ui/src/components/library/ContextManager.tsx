import { useState, useRef, useEffect } from 'react';
import type { Context, Source } from '@/types';
import { cn } from '@/lib/utils';

interface ContextManagerProps {
  contexts: Context[];
  maxContexts?: number;
  onAddContext: (context: Context) => void;
  onUpdateContext: (contextId: string, updates: Partial<Context>) => void;
  onDeleteContext: (contextId: string) => void;
}

export function ContextManager({
  contexts,
  maxContexts = 5,
  onAddContext,
  onUpdateContext,
  onDeleteContext,
}: ContextManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const contextCount = contexts.length;
  const hasEmptySlots = contextCount < maxContexts;

  const handleAdd = (newContext: Context) => {
    onAddContext(newContext);
    setIsAdding(false);
  };

  const handleUpdate = (contextId: string, updates: Partial<Context>) => {
    onUpdateContext(contextId, updates);
    setEditingId(null);
  };

  return (
    <div className="context-manager space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Contexts ({contextCount}/{maxContexts})
        </h3>
        {hasEmptySlots && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            + Add Context
          </button>
        )}
      </div>

      <div className="flex gap-1">
        {Array.from({ length: maxContexts }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i < contextCount ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      <div className="space-y-3">
        {contexts.map((context, index) => (
          <ContextEditor
            key={context.id}
            context={context}
            index={index}
            isEditing={editingId === context.id}
            onEdit={() => setEditingId(context.id)}
            onSave={(updates) => handleUpdate(context.id, updates)}
            onCancel={() => setEditingId(null)}
            onDelete={() => onDeleteContext(context.id)}
          />
        ))}

        {isAdding && (
          <ContextEditor
            context={null}
            index={contextCount}
            isEditing={true}
            onSave={handleAdd}
            onCancel={() => setIsAdding(false)}
          />
        )}

        {contextCount === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
            <p>No contexts yet</p>
            <button
              onClick={() => setIsAdding(true)}
              className="mt-2 text-primary hover:underline text-sm"
            >
              Add your first context
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ContextEditorProps {
  context: Context | null;
  index: number;
  isEditing: boolean;
  onEdit?: () => void;
  onSave: (context: Context) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

function ContextEditor({
  context,
  index,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: ContextEditorProps) {
  const [wordForm, setWordForm] = useState(context?.word_form || '');
  const [sentence, setSentence] = useState(context?.sentence || '');
  const [sourceType, setSourceType] = useState<Source['type']>(
    context?.source?.type || 'web'
  );
  const [sourceData, setSourceData] = useState({
    title: '',
    url: '',
    filename: '',
    timestamp: '',
    name: '',
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSubmit = () => {
    if (!wordForm.trim() || !sentence.trim()) return;

    const source: Source = {
      type: sourceType,
      ...(sourceType === 'web' && {
        title: sourceData.title || 'Web Page',
        url: sourceData.url || '',
      }),
      ...(sourceType === 'video' && {
        filename: sourceData.filename || '',
        timestamp: sourceData.timestamp || '',
      }),
      ...(sourceType === 'pdf' && {
        filename: sourceData.filename || '',
      }),
      ...(sourceType === 'app' && {
        name: sourceData.name || 'App',
      }),
    } as Source;

    const newContext: Context = {
      id: context?.id || crypto.randomUUID(),
      word_form: wordForm.trim(),
      sentence: sentence.trim(),
      audio: context?.audio as any,
      image: context?.image as any,
      source,
      created_at: context?.created_at || new Date().toISOString(),
    };

    onSave(newContext);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (context) {
        onCancel();
      }
    }
  };

  if (!isEditing && context) {
    return (
      <div
        className="context-item p-4 border border-border rounded-lg hover:border-primary/50 transition-colors cursor-pointer"
        onClick={onEdit}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit?.();
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="flex items-center justify-center w-5 h-5 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                {index + 1}
              </span>
              <span className="font-medium text-foreground">{context.word_form}</span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 ml-7">
              {context.sentence}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SourceBadge source={context.source} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="context-editor p-4 border border-primary rounded-lg bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-5 h-5 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
            {context ? index + 1 : index + 1}
          </span>
          <span className="text-sm font-medium text-foreground">
            {context ? 'Edit Context' : 'New Context'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Ctrl/Cmd + Enter to save
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Word Form
        </label>
        <input
          type="text"
          value={wordForm}
          onChange={(e) => setWordForm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="The specific form of the word in this context"
          className="w-full px-3 py-2 bg-muted border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Sentence
        </label>
        <textarea
          ref={textareaRef}
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="The full sentence or context where the word appears"
          rows={3}
          className="w-full px-3 py-2 bg-muted border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Source Type
        </label>
        <div className="flex gap-2">
          {(['web', 'video', 'pdf', 'app'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSourceType(type)}
              className={cn(
                'px-3 py-1.5 text-xs rounded-md transition-colors capitalize',
                sourceType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {sourceType === 'web' && (
        <>
          <input
            type="text"
            value={sourceData.title}
            onChange={(e) => setSourceData({ ...sourceData, title: e.target.value })}
            placeholder="Page title"
            className="w-full px-3 py-2 bg-muted border border-border rounded-md text-sm"
          />
          <input
            type="url"
            value={sourceData.url}
            onChange={(e) => setSourceData({ ...sourceData, url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 bg-muted border border-border rounded-md text-sm"
          />
        </>
      )}

      {sourceType === 'video' && (
        <>
          <input
            type="text"
            value={sourceData.filename}
            onChange={(e) => setSourceData({ ...sourceData, filename: e.target.value })}
            placeholder="Video filename"
            className="w-full px-3 py-2 bg-muted border border-border rounded-md text-sm"
          />
          <input
            type="text"
            value={sourceData.timestamp}
            onChange={(e) => setSourceData({ ...sourceData, timestamp: e.target.value })}
            placeholder="Timestamp (e.g., 00:01:30)"
            className="w-full px-3 py-2 bg-muted border border-border rounded-md text-sm"
          />
        </>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        {context && onDelete && (
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm text-destructive hover:text-destructive/80 transition-colors"
          >
            Delete
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!wordForm.trim() || !sentence.trim()}
          className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {context ? 'Save Changes' : 'Add Context'}
        </button>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: Source }) {
  const icon = {
    web: '🌐',
    video: '🎬',
    pdf: '📄',
    app: '📱',
  }[source.type];

  const label = {
    web: (source as any).title || 'Web',
    video: (source as any).filename || 'Video',
    pdf: (source as any).filename || 'PDF',
    app: (source as any).name || 'App',
  }[source.type];

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs">
      <span>{icon}</span>
      <span className="truncate max-w-[100px]">{label}</span>
    </span>
  );
}
