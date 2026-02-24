import { motion, AnimatePresence } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface GlobalHotkeyToastProps {
  open: boolean;
  message: string;
  duration?: number;
  onClose: () => void;
}

export function GlobalHotkeyToast({
  open,
  message,
  duration = 2000,
  onClose,
}: GlobalHotkeyToastProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto close after duration
  const handleOpen = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onClose();
    }, duration);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.9 }}
          transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
          onAnimationStart={handleOpen}
          className={cn(
            'fixed top-0 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-4 rounded-b-lg shadow-xl border border-border',
            'bg-primary text-primary-foreground',
            'flex items-center gap-3 min-w-[300px] max-w-md'
          )}
        >
          <div className="text-lg font-medium">{message}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
