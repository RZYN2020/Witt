import { useCallback, useEffect, useState } from 'react';
import {
  askLlmAboutSelection,
  createAnnotation,
  getDictionaryCache,
  getSettings,
  listPromptProfiles,
  openPromptProfile,
  readPromptProfile,
  saveDictionaryCache,
  savePromptProfile,
  type PromptProfile,
} from '@/lib/commands';
import { type SelectionPopupModel } from '@/components/reader/readerEpub';

interface UseSelectionToolsOptions {
  bookId: string;
  onKnownWord: (word: string) => void;
  setStatus: (status: string) => void;
}

export function useSelectionTools({ bookId, onKnownWord, setStatus }: UseSelectionToolsOptions) {
  const [popup, setPopup] = useState<SelectionPopupModel | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [aiAnswer, setAiAnswer] = useState('');
  const [askingAi, setAskingAi] = useState(false);
  const [explanationState, setExplanationState] = useState<'idle' | 'loading' | 'cached' | 'error'>(
    'idle'
  );
  const [promptProfiles, setPromptProfiles] = useState<PromptProfile[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState('explain');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptContent, setEditingPromptContent] = useState('');
  const [savedWord, setSavedWord] = useState('');
  const [askAiEnabled, setAskAiEnabled] = useState(true);
  const [askAiPromptId, setAskAiPromptId] = useState('explain');

  useEffect(() => {
    void listPromptProfiles()
      .then((profiles) => {
        setPromptProfiles(profiles);
        setSelectedPromptId((current) =>
          profiles.some((profile) => profile.id === current)
            ? current
            : (profiles[0]?.id ?? 'explain')
        );
      })
      .catch(() => setPromptProfiles([]));
  }, []);

  const refreshSettings = useCallback(() => {
    void getSettings()
      .then((settings) => {
        setAskAiEnabled(settings.selection_ask_ai_enabled);
        setAskAiPromptId(settings.selection_ask_ai_prompt_id || 'explain');
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const resetPopupTools = useCallback(() => {
    setAiAnswer('');
    setExplanationState('idle');
    setSavedWord('');
  }, []);

  useEffect(() => {
    if (!popup) {
      return;
    }
    let disposed = false;
    const word = popup.word.trim();
    if (!word) {
      return;
    }
    setExplanationState('loading');
    void getDictionaryCache(word, askAiPromptId)
      .then((cached) => {
        if (disposed) {
          return;
        }
        if (cached?.meaning) {
          setAiAnswer(cached.meaning);
          setExplanationState('cached');
          return;
        }
        setExplanationState('idle');
      })
      .catch(() => {
        if (!disposed) {
          setExplanationState('error');
        }
      });
    return () => {
      disposed = true;
    };
  }, [popup, askAiPromptId]);

  const captureSelection = useCallback(async () => {
    if (!popup || capturing) {
      return;
    }
    const word = popup.word.trim();
    const sentence = popup.sentence.trim();
    if (!word || !sentence) {
      setStatus('Word and context are required');
      return;
    }

    setCapturing(true);
    try {
      await createAnnotation({
        book_id: bookId,
        word,
        sentence,
        chapter_title: popup.chapterTitle || null,
        epub_cfi: popup.cfiRange || null,
      });
      setStatus(`Captured "${word}"`);
      onKnownWord(word);
      setPopup(null);
    } finally {
      setCapturing(false);
    }
  }, [bookId, capturing, onKnownWord, popup, setStatus]);

  const askAi = useCallback(
    async (promptId?: string) => {
      if (!popup || askingAi) {
        return;
      }

      const prompt = promptId || askAiPromptId;
      setAskingAi(true);
      setExplanationState('loading');
      setAiAnswer('');
      try {
        const canUseWordCache = prompt === askAiPromptId;
        if (canUseWordCache) {
          const cached = await getDictionaryCache(popup.word.trim(), prompt);
          if (cached?.meaning) {
            setAiAnswer(cached.meaning);
            setExplanationState('cached');
            return;
          }
        }
        const answer = await askLlmAboutSelection({
          selected_text: popup.selectedText,
          word: popup.word.trim(),
          sentence: popup.sentence.trim(),
          chapter_title: popup.chapterTitle || null,
          question: 'Explain this in context',
          prompt_id: prompt,
        });
        setAiAnswer(answer);
        setExplanationState('idle');
        if (canUseWordCache && answer.trim()) {
          void saveDictionaryCache({
            word: popup.word.trim(),
            meaning: answer,
            prompt_id: prompt,
          }).catch(() => undefined);
        }
      } catch (error) {
        setAiAnswer(error instanceof Error ? error.message : 'LLM request failed');
        setExplanationState('error');
      } finally {
        setAskingAi(false);
      }
    },
    [askAiPromptId, askingAi, popup]
  );

  const editPrompt = useCallback(async () => {
    try {
      const profile = await readPromptProfile(selectedPromptId);
      setEditingPromptId(selectedPromptId);
      setEditingPromptContent(profile);
    } catch {
      try {
        await openPromptProfile(selectedPromptId);
        setStatus('Opened in external editor');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Failed to open prompt');
      }
    }
  }, [selectedPromptId, setStatus]);

  const savePrompt = useCallback(
    async (content: string) => {
      if (!editingPromptId) {
        return;
      }
      await savePromptProfile(editingPromptId, content);
      const profiles = await listPromptProfiles();
      setPromptProfiles(profiles);
    },
    [editingPromptId]
  );

  const closePromptEditor = useCallback(() => {
    setEditingPromptId(null);
    setEditingPromptContent('');
  }, []);

  return {
    aiAnswer,
    askAi,
    askingAi,
    captureSelection,
    capturing,
    closePromptEditor,
    editPrompt,
    editingPromptContent,
    editingPromptId,
    explanationState,
    popup,
    promptProfiles,
    resetPopupTools,
    savePrompt,
    savedWord,
    selectedPromptId,
    askAiEnabled,
    askAiPromptId,
    refreshSettings,
    setAiAnswer,
    setPopup,
    setSelectedPromptId,
  };
}
