import { useCallback, useEffect, useRef, useState } from 'react';
import {
  askLlmChat,
  askLlmChatStream,
  hasTauriRuntime,
  onChatStreamChunk,
  onChatStreamDone,
  onChatStreamError,
  type ChatMessage,
} from '@/lib/commands';
import type { UnlistenFn } from '@tauri-apps/api/event';

export interface AiChatSession {
  messages: ChatMessage[];
  loading: boolean;
}

interface UseAiChatOptions {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  chapterTitle?: string | null;
  pageNumber?: number | null;
  totalPages?: number | null;
}

export function useAiChat({
  bookId,
  bookTitle,
  bookAuthor,
  chapterTitle,
  pageNumber,
  totalPages,
}: UseAiChatOptions) {
  const [session, setSession] = useState<AiChatSession>({
    messages: [],
    loading: false,
  });
  const [inputText, setInputText] = useState('');
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const unlistenersRef = useRef<UnlistenFn[]>([]);
  const streamSessionIdRef = useRef<string | null>(null);

  // Clean up stream listeners on unmount
  useEffect(() => {
    return () => {
      for (const unlisten of unlistenersRef.current) {
        unlisten();
      }
    };
  }, []);

  const cleanupListeners = useCallback(() => {
    for (const unlisten of unlistenersRef.current) {
      unlisten();
    }
    unlistenersRef.current = [];
    streamSessionIdRef.current = null;
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || sessionRef.current.loading) {
        return;
      }
      const userMsg: ChatMessage = { role: 'user', content: content.trim() };
      const updatedMessages = [...sessionRef.current.messages, userMsg];

      if (hasTauriRuntime()) {
        const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
        setSession({ messages: [...updatedMessages, assistantMsg], loading: true });
        setInputText('');

        try {
          // Register listeners before starting the stream so we don't miss events
          cleanupListeners();

          const unlistenChunk = await onChatStreamChunk((data) => {
            if (data.session_id !== streamSessionIdRef.current) {
              return;
            }
            setSession((prev) => {
              const msgs = [...prev.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                msgs[msgs.length - 1] = { ...last, content: last.content + data.content };
              }
              return { ...prev, messages: msgs };
            });
          });

          const unlistenDone = await onChatStreamDone((data) => {
            if (data.session_id !== streamSessionIdRef.current) {
              return;
            }
            setSession((prev) => ({ ...prev, loading: false }));
            cleanupListeners();
          });

          const unlistenError = await onChatStreamError((data) => {
            if (data.session_id !== streamSessionIdRef.current) {
              return;
            }
            setSession((prev) => {
              const msgs = [...prev.messages];
              const last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant') {
                msgs[msgs.length - 1] = {
                  ...last,
                  content: last.content + `\n\nError: ${data.error}`,
                };
              }
              return { messages: msgs, loading: false };
            });
            cleanupListeners();
          });

          unlistenersRef.current = [unlistenChunk, unlistenDone, unlistenError];

          // Now start the stream — the listeners are already in place
          const sessionId = await askLlmChatStream({
            book_id: bookId,
            book_title: bookTitle,
            book_author: bookAuthor,
            chapter_title: chapterTitle ?? null,
            page_number: pageNumber ?? null,
            total_pages: totalPages ?? null,
            messages: updatedMessages,
          });
          streamSessionIdRef.current = sessionId;
        } catch (error) {
          setSession((prev) => {
            const msgs = [...prev.messages];
            const last = msgs[msgs.length - 1];
            if (last && last.role === 'assistant') {
              msgs[msgs.length - 1] = {
                ...last,
                content: `Error: ${error instanceof Error ? error.message : 'Stream request failed'}`,
              };
            }
            return { messages: msgs, loading: false };
          });
        }
      } else {
        // Browser fallback: non-streaming
        setSession({ messages: updatedMessages, loading: true });
        setInputText('');

        try {
          const response = await askLlmChat({
            book_id: bookId,
            book_title: bookTitle,
            book_author: bookAuthor,
            chapter_title: chapterTitle ?? null,
            page_number: pageNumber ?? null,
            total_pages: totalPages ?? null,
            messages: updatedMessages,
          });
          const assistantMsg: ChatMessage = { role: 'assistant', content: response.content };
          setSession((prev) => ({
            messages: [...prev.messages, assistantMsg],
            loading: false,
          }));
        } catch (error) {
          const errorMsg: ChatMessage = {
            role: 'assistant',
            content: `Error: ${error instanceof Error ? error.message : 'Request failed'}`,
          };
          setSession((prev) => ({
            messages: [...prev.messages, errorMsg],
            loading: false,
          }));
        }
      }
    },
    [bookId, bookAuthor, bookTitle, chapterTitle, pageNumber, totalPages, cleanupListeners]
  );

  const seedFromPopup = useCallback((question: string, answer: string) => {
    setSession({
      messages: [
        { role: 'user', content: question },
        { role: 'assistant', content: answer },
      ],
      loading: false,
    });
  }, []);

  const quoteSelection = useCallback((text: string) => {
    const quoted = `> ${text.split('\n').join('\n> ')}\n\n`;
    setInputText(quoted);
  }, []);

  const clearSession = useCallback(() => {
    cleanupListeners();
    setSession({ messages: [], loading: false });
    setInputText('');
  }, [cleanupListeners]);

  return {
    session,
    inputText,
    setInputText,
    sendMessage,
    seedFromPopup,
    quoteSelection,
    clearSession,
  };
}
