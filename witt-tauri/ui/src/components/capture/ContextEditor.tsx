import { useRef, useEffect } from 'react';
import type { Source } from '@/types';
import { cn } from '@/lib/utils';

interface ContextEditorProps {
  value: string;
  onChange: (value: string) => void;
  source?: Source;
  isFocused: boolean;
  onFocus: () => void;
}

/**
 * Editable context textarea with auto-resize
 * Shows source metadata below the text
 */
export function ContextEditor({
  value,
  onChange,
  source,
  isFocused,
  onFocus,
}: ContextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 150; // ~6 lines
    
    textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value]);

  // Focus on mount when triggered programmatically
  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isFocused]);

  const getSourceDisplay = () => {
    if (!source) return null;

    switch (source.type) {
      case 'web':
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {source.icon && <img src={source.icon} alt="" className="w-4 h-4" />}
            <span className="truncate max-w-md">{source.title}</span>
          </div>
        );
      case 'video':
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>🎬</span>
            <span className="truncate">{source.filename}</span>
            <span className="text-muted-foreground/60">•</span>
            <span>{source.timestamp}</span>
          </div>
        );
      case 'pdf':
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>📄</span>
            <span className="truncate">{source.filename}</span>
            {source.page && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span>p. {source.page}</span>
              </>
            )}
          </div>
        );
      case 'app':
        return (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>💻</span>
            <span className="truncate">{source.name}</span>
            {source.title && (
              <>
                <span className="text-muted-foreground/60">•</span>
                <span className="truncate">{source.title}</span>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="context-editor"
          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
        >
          Context
        </label>
        <span className="text-xs text-muted-foreground">
          {value.length} chars
        </span>
      </div>

      <textarea
        ref={textareaRef}
        id="context-editor"
        data-field="context"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        className={cn(
          'w-full px-3 py-2 rounded-md border border-input bg-background',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'resize-none transition-all duration-200',
          'min-h-[80px]'
        )}
        placeholder="Enter or paste the context where this word appears..."
        rows={3}
      />

      {/* Source metadata */}
      {source && (
        <div className="flex items-center gap-2 pt-1">
          {getSourceDisplay()}
        </div>
      )}
    </div>
  );
}
