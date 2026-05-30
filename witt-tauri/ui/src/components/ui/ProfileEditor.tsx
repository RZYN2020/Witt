import { Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ProfileEditorProps {
  title: string;
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  onClose: () => void;
}

export function ProfileEditor({ title, initialContent, onSave, onClose }: ProfileEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const format = () => {
    try {
      const parsed: unknown = JSON.parse(content);
      setContent(JSON.stringify(parsed, null, 2));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  const save = async () => {
    try {
      JSON.parse(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(content);
      setStatus('Saved');
      setTimeout(() => onClose(), 600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="flex max-h-[min(86vh,44rem)] w-[min(40rem,calc(100vw-2rem))] flex-col rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <button
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 p-5">
          <textarea
            className="h-[min(60vh,32rem)] w-full resize-none rounded-md border border-input bg-muted/30 px-3 py-3 font-mono text-xs leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-ring"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setError('');
            }}
            spellCheck={false}
          />
          {error && (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={format}>
              Format
            </Button>
            {status && <span className="text-xs text-muted-foreground">{status}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={saving}>
              <Save size={14} />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
