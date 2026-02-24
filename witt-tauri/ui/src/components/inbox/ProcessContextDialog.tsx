import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useInboxStore } from '@/stores/useInboxStore';
import type { InboxItem } from '@/types';
import { cn } from '@/lib/utils';

export function ProcessContextDialog({
  item,
  open,
  onClose,
}: {
  item: InboxItem | null;
  open: boolean;
  onClose: () => void;
}) {
  const { extractWordsWithFrequency, processItem, isProcessing } = useInboxStore();
  const [candidates, setCandidates] = useState<Array<{ word: string; count?: number }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState('');

  useEffect(() => {
    if (!open || !item) return;

    setCandidates([]);
    setSelected(new Set());
    setManual('');

    void (async () => {
      const words = await extractWordsWithFrequency(item.context);
      setCandidates(words);
    })();
  }, [open, item, extractWordsWithFrequency]);

  const selectedList = useMemo(() => Array.from(selected).sort(), [selected]);

  const toggle = (w: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(w)) next.delete(w);
      else next.add(w);
      return next;
    });
  };

  const addManual = () => {
    const parts = manual
      .split(/[\s,]+/g)
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length === 0) return;

    setSelected((prev) => {
      const next = new Set(prev);
      for (const p of parts) next.add(p);
      return next;
    });
    setManual('');
  };

  const handleProcess = async () => {
    if (!item) return;
    await processItem(item.id, Array.from(selected));
    onClose();
  };

  return (
    <AnimatePresence>
      {open && item && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            className="w-full max-w-3xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="text-sm font-semibold">Process Context</div>
              <button
                className="p-1 hover:bg-accent rounded transition-colors"
                onClick={onClose}
                disabled={isProcessing}
                title="Close"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="text-xs text-muted-foreground">Context</div>
                <div className="border border-border rounded-md p-3 text-sm whitespace-pre-wrap max-h-64 overflow-auto">
                  {item.context}
                </div>
                <div className="text-xs text-muted-foreground">Manual add</div>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 h-10 px-3 rounded-md border border-border bg-background text-sm"
                    placeholder="Type lemmas, separated by space/comma"
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addManual();
                      }
                    }}
                  />
                  <Button variant="outline" onClick={addManual} disabled={!manual.trim()}>
                    Add
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">Candidates</div>
                  <div className="text-xs text-muted-foreground">Selected: {selectedList.length}</div>
                </div>

                <div className="border border-border rounded-md overflow-hidden">
                  <div className="max-h-64 overflow-auto">
                    {candidates.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No candidates.</div>
                    ) : (
                      <div className="divide-y divide-border">
                        {candidates.map((c) => {
                          const checked = selected.has(c.word);
                          return (
                            <label
                              key={c.word}
                              className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer"
                            >
                              <input type="checkbox" checked={checked} onChange={() => toggle(c.word)} />
                              <span className={cn('flex-1', checked ? 'font-medium' : '')}>{c.word}</span>
                              {typeof c.count === 'number' && (
                                <span className="text-xs text-muted-foreground">{c.count}</span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {selectedList.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedList.map((w) => (
                      <button
                        key={w}
                        className="px-2 py-1 text-xs rounded bg-muted hover:bg-accent border border-border"
                        onClick={() => toggle(w)}
                        type="button"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                Select one or more lemmas to create/update notes.
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleProcess}
                  disabled={isProcessing || selectedList.length === 0 || item.processed}
                >
                  {isProcessing ? 'Processing…' : 'Process'}
                </Button>
              </div>
            </div>

            {isProcessing && (
              <div className="h-1 bg-muted">
                <div className="h-1 w-1/3 bg-primary animate-pulse" />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
