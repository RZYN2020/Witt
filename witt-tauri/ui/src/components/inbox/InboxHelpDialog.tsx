import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

export function InboxHelpDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
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
            className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="text-sm font-semibold">Inbox Help</div>
              <button
                className="p-1 hover:bg-accent rounded transition-colors"
                onClick={onClose}
                title="Close"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4 text-sm">
              <div>
                <div className="font-medium mb-1">What is Inbox?</div>
                <div className="text-muted-foreground">
                  Inbox stores raw contexts you want to process later. Each item can be turned into one or more notes by selecting lemmas.
                </div>
              </div>

              <div>
                <div className="font-medium mb-1">Quick capture</div>
                <div className="text-muted-foreground">
                  Use the global shortcut <span className="font-mono">CommandOrControl+Alt+I</span> to open the quick capture window, paste text, and save to Inbox.
                </div>
              </div>

              <div>
                <div className="font-medium mb-1">Processing</div>
                <div className="text-muted-foreground">
                  Click <span className="font-medium">Process</span>, choose suggested lemmas (with frequency), add any manual lemmas, then process to create/update notes.
                </div>
              </div>

              <div>
                <div className="font-medium mb-1">Context duplication</div>
                <div className="text-muted-foreground">
                  This version allows duplicate contexts: processing one Inbox item with multiple lemmas will create one context record per lemma.
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-end">
              <Button variant="primary" onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

