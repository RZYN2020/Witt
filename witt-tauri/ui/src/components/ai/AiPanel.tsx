import { Send, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { AiChatView } from './AiChatView';
import { type AiChatSession } from './useAiChat';

interface AiPanelProps {
  session: AiChatSession;
  inputText: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onClear: () => void;
}

export function AiPanel({ session, inputText, onInputChange, onSend, onClear }: AiPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = 'auto';
    const maxH = 160;
    el.style.height = `${Math.min(el.scrollHeight, maxH)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [inputText, autoResize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <aside className="flex h-full flex-col bg-background text-foreground">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">AI Chat</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Reading companion</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            title="Clear chat"
            aria-label="Clear chat"
            onClick={onClear}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <AiChatView messages={session.messages} loading={session.loading} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            className="min-w-0 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-6"
            style={{ maxHeight: 160 }}
            placeholder="Ask about this book..."
            value={inputText}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={session.loading}
          />
          <Button
            size="sm"
            variant="primary"
            disabled={!inputText.trim() || session.loading}
            onClick={onSend}
          >
            <Send size={15} />
          </Button>
        </div>
      </div>
    </aside>
  );
}
