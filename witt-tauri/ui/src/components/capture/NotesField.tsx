import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface NotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  isFocused: boolean;
  onFocus: () => void;
}

/**
 * Optional notes textarea for additional context
 */
export function NotesField({ value, onChange, isFocused, onFocus }: NotesFieldProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isFocused && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFocused]);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor="notes-field"
        className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
      >
        Notes <span className="font-normal italic">(optional)</span>
      </label>
      <textarea
        ref={textareaRef}
        data-field="notes"
        id="notes-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        className={cn(
          'w-full px-3 py-2 rounded-md border border-input bg-background',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          'resize-none transition-all duration-200',
          'min-h-[60px]'
        )}
        placeholder="Add any personal notes or memory aids..."
        rows={2}
      />
    </div>
  );
}
