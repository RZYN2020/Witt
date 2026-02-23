import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Check, AlertCircle, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DownloadDialogProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
  filePath?: string;
  progress?: number;
  status: 'downloading' | 'completed' | 'error';
  errorMessage?: string;
  onOpenLocation?: () => void;
}

/**
 * Download progress dialog
 */
export function DownloadDialog({
  open,
  onClose,
  fileName,
  filePath,
  progress = 0,
  status,
  errorMessage,
  onOpenLocation,
}: DownloadDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Dialog */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div
              className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden p-6 pointer-events-auto mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      status === 'completed' && 'bg-green-500/10',
                      status === 'error' && 'bg-red-500/10',
                      status === 'downloading' && 'bg-primary/10'
                    )}
                  >
                    {status === 'completed' && <Check className="w-5 h-5 text-green-600" />}
                    {status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                    {status === 'downloading' && <Download className="w-5 h-5 text-primary" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {status === 'completed'
                        ? 'Download Complete'
                        : status === 'error'
                          ? 'Download Failed'
                          : 'Downloading...'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                      {fileName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Progress */}
              {status === 'downloading' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground font-medium">{progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className="h-full bg-primary transition-all"
                    />
                  </div>
                </div>
              )}

              {/* File Path */}
              {filePath && status === 'completed' && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Saved to:</p>
                  <p className="text-sm text-foreground font-mono break-all">{filePath}</p>
                </div>
              )}

              {/* Error Message */}
              {status === 'error' && errorMessage && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                {status === 'completed' && (
                  <>
                    <button
                      onClick={() => {
                        if (onOpenLocation) {
                          onOpenLocation();
                        } else if (filePath) {
                          // Fallback: copy to clipboard
                          navigator.clipboard.writeText(filePath);
                          alert('File path copied to clipboard:\n\n' + filePath);
                        }
                      }}
                      className="flex items-center justify-center gap-2 flex-1 py-2.5 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                      title="Open file location in file manager"
                    >
                      <FolderOpen className="w-4 h-4" />
                      <span>Open Location</span>
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-accent transition-colors"
                    >
                      Close
                    </button>
                  </>
                )}
                {status !== 'completed' && (
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 px-4 bg-muted text-foreground rounded-lg font-medium hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
