import { useCallback, useState } from 'react';
import { askLlmChat, type ChatMessage } from '@/lib/commands';

export interface AiChatSession {
  messages: ChatMessage[];
  loading: boolean;
}

interface UseAiChatOptions {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  chapterTitle?: string | null;
}

export function useAiChat({ bookId, bookTitle, bookAuthor, chapterTitle }: UseAiChatOptions) {
  const [session, setSession] = useState<AiChatSession>({
    messages: [],
    loading: false,
  });
  const [inputText, setInputText] = useState('');

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || session.loading) {
        return;
      }
      const userMsg: ChatMessage = { role: 'user', content: content.trim() };
      const updatedMessages = [...session.messages, userMsg];
      setSession({ messages: updatedMessages, loading: true });
      setInputText('');

      try {
        const response = await askLlmChat({
          book_id: bookId,
          book_title: bookTitle,
          book_author: bookAuthor,
          chapter_title: chapterTitle ?? null,
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
    },
    [bookId, bookAuthor, bookTitle, chapterTitle, session.loading, session.messages]
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

  const clearSession = useCallback(() => {
    setSession({ messages: [], loading: false });
    setInputText('');
  }, []);

  return {
    session,
    inputText,
    setInputText,
    sendMessage,
    seedFromPopup,
    clearSession,
  };
}
