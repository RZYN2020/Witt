import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Source } from '@/types';
import { useInboxStore } from '@/stores/useInboxStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type Pending = { text?: string; source?: Source };

function readPending(): Pending | null {
  try {
    const raw = localStorage.getItem('witt:pendingInboxCapture');
    if (!raw) return null;
    localStorage.removeItem('witt:pendingInboxCapture');
    return JSON.parse(raw) as Pending;
  } catch {
    return null;
  }
}

export function InboxCapturePopup() {
  const { addToInbox } = useInboxStore();
  const [open, setOpen] = useState(true);
  const [context, setContext] = useState('');
  const [source, setSource] = useState<Source>({ type: 'app', name: 'Inbox Quick Capture' });
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const pending = readPending();
    if (pending?.text) {
      setContext(pending.text.trim());
    }
    if (pending?.source) {
      setSource(pending.source);
    }
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const closeWindowBestEffort = async () => {
    try {
      const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const win = getCurrentWebviewWindow();
      try {
        await win.hide();
      } catch {
        // ignore
      }
      try {
        await win.close();
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);
    await addToInbox(context, source);
    setSaving(false);
    setOpen(false);
    await closeWindowBestEffort();
  };

  const onCancel = async () => {
    setOpen(false);
    await closeWindowBestEffort();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn('fixed inset-0 z-50 bg-background flex items-center justify-center p-6')}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
              <div className="text-sm font-semibold">Inbox Quick Capture</div>
              <button
                onClick={onCancel}
                className="p-1 hover:bg-accent rounded transition-colors"
                title="Close"
                disabled={saving}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="text-xs text-muted-foreground">Context</div>
              <textarea
                ref={textareaRef}
                className="w-full min-h-[160px] max-h-[50vh] resize-y px-3 py-2 rounded-md border border-border bg-background text-sm whitespace-pre-wrap"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Paste or type context…"
              />

              <div className="text-xs text-muted-foreground">
                Source: {source.type}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button variant="primary" onClick={onSave} disabled={saving || !context.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

