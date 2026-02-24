import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Inbox, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToastMessage {
  id: string;
  type: 'capture' | 'inbox';
  title: string;
  content: string;
}

interface GlobalCaptureToastProps {
  className?: string;
}

/**
 * Global capture success toast - visible on all workspaces
 * This component renders a floating toast that appears on top of all windows
 */
export function GlobalCaptureToast({ className }: GlobalCaptureToastProps) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  useEffect(() => {
    // Listen for capture success events
    const handleCaptureSuccess = (event: CustomEvent<{ word?: string; context: string }>) => {
      const { word, context } = event.detail;
      const id = crypto.randomUUID();
      const newMessage: ToastMessage = {
        id,
        type: 'capture',
        title: word ? `Captured: ${word}` : 'Context Captured',
        content: context.slice(0, 80) + (context.length > 80 ? '...' : ''),
      };
      setMessages((prev) => [...prev, newMessage]);

      // Auto remove after 3 seconds
      setTimeout(() => removeMessage(id), 3000);
    };

    // Listen for inbox success events
    const handleInboxSuccess = (event: CustomEvent<{ context: string }>) => {
      const { context } = event.detail;
      const id = crypto.randomUUID();
      const newMessage: ToastMessage = {
        id,
        type: 'inbox',
        title: 'Saved to Inbox',
        content: context.slice(0, 80) + (context.length > 80 ? '...' : ''),
      };
      setMessages((prev) => [...prev, newMessage]);

      setTimeout(() => removeMessage(id), 3000);
    };

    window.addEventListener('witt:capture-success', handleCaptureSuccess as EventListener);
    window.addEventListener('witt:inbox-success', handleInboxSuccess as EventListener);

    return () => {
      window.removeEventListener('witt:capture-success', handleCaptureSuccess as EventListener);
      window.removeEventListener('witt:inbox-success', handleInboxSuccess as EventListener);
    };
  }, [removeMessage]);

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none',
        className
      )}
    >
      <AnimatePresence mode="popLayout">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={cn(
              'pointer-events-auto min-w-[280px] max-w-[360px]',
              'bg-background/95 backdrop-blur-md border shadow-2xl rounded-xl overflow-hidden',
              'flex items-start gap-3 p-4',
              message.type === 'capture'
                ? 'border-primary/30 shadow-primary/10'
                : 'border-blue-500/30 shadow-blue-500/10'
            )}
          >
            <div
              className={cn(
                'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                message.type === 'capture' ? 'bg-primary/10 text-primary' : 'bg-blue-500/10 text-blue-500'
              )}
            >
              {message.type === 'capture' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Inbox className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-foreground">{message.title}</h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{message.content}</p>
            </div>
            <button
              onClick={() => removeMessage(message.id)}
              className="flex-shrink-0 p-1 hover:bg-accent rounded-md transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Helper to dispatch capture success event
 */
export function dispatchCaptureSuccess(word: string | undefined, context: string) {
  window.dispatchEvent(
    new CustomEvent('witt:capture-success', {
      detail: { word, context },
    })
  );
}

/**
 * Helper to dispatch inbox success event
 */
export function dispatchInboxSuccess(context: string) {
  window.dispatchEvent(
    new CustomEvent('witt:inbox-success', {
      detail: { context },
    })
  );
}
