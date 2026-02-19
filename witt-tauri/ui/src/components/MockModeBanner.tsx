import { motion, AnimatePresence } from 'framer-motion';
import { Beaker, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Banner shown during mock development mode
 * Reminds users that data is not persisted
 */
export function MockModeBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm">
            <Beaker className="w-4 h-4" />
            <span className="font-medium">Mock Mode</span>
            <span className="opacity-75">— Data will not persist</span>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 hover:bg-amber-200 dark:hover:bg-amber-800 rounded transition-colors"
            title="Dismiss for this session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
