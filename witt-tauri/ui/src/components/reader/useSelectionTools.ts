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
  saveSettings,
  type PromptProfile,
} from '@/lib/commands';
import { type SelectionPopupMode } from '@/components/reader/SelectionPopup';
import { type SelectionPopupModel } from '@/components/reader/readerEpub';

interface UseSelectionToolsOptions {
  bookId: string;
  onKnownWord: (word: string) => void;
  setStatus: (status: string) => void;
}

export function useSelectionTools({ bookId, onKnownWord, setStatus }: UseSelectionToolsOptions) {
  const [popup, setPopup] = useState<SelectionPopupModel | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('Explain this in context');
  const [aiAnswer, setAiAnswer] = useState('');
  const [askingAi, setAskingAi] = useState(false);
  const [explanationState, setExplanationState] = useState<'idle' | 'loading' | 'cached' | 'error'>(
    'idle'
  );
  const [promptProfiles, setPromptProfiles] = useState<PromptProfile[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState('explain');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptContent, setEditingPromptContent] = useState('');
  const [popupMode, setPopupMode] = useState<SelectionPopupMode>('toolbar');
  const [savedWord, setSavedWord] = useState('');
  const [autoAskAi, setAutoAskAi] = useState(false);
  const [lastAutoAskKey, setLastAutoAskKey] = useState('');

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

  useEffect(() => {
    void getSettings()
      .then((settings) => setAutoAskAi(settings.selection_auto_ask_ai))
      .catch(() => setAutoAskAi(false));
  }, []);

  const resetPopupTools = useCallback(() => {
    setAiAnswer('');
    setExplanationState('idle');
    setAiQuestion('Explain this in context');
    setPopupMode('toolbar');
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
    void getDictionaryCache(word, selectedPromptId)
      .then((cached) => {
        if (disposed) {
          return;
        }
        if (cached?.meaning) {
          setAiAnswer(cached.meaning);
          setPopupMode('ai');
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
  }, [popup, selectedPromptId]);

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

  const askAi = useCallback(async () => {
    if (!popup || askingAi) {
      return;
    }

    const question = aiQuestion.trim() || 'Explain this in context';
    const canUseWordCache = question === 'Explain this in context';
    setAskingAi(true);
    setExplanationState('loading');
    setAiAnswer('');
    try {
      if (canUseWordCache) {
        const cached = await getDictionaryCache(popup.word.trim(), selectedPromptId);
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
        question,
        prompt_id: selectedPromptId,
      });
      setAiAnswer(answer);
      setExplanationState('idle');
      if (canUseWordCache && answer.trim()) {
        void saveDictionaryCache({
          word: popup.word.trim(),
          meaning: answer,
          prompt_id: selectedPromptId,
        }).catch(() => undefined);
      }
    } catch (error) {
      setAiAnswer(error instanceof Error ? error.message : 'LLM request failed');
      setExplanationState('error');
    } finally {
      setAskingAi(false);
    }
  }, [aiQuestion, askingAi, popup, selectedPromptId]);

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

  const toggleAutoAskAi = useCallback(async () => {
    const settings = await getSettings();
    const next = !autoAskAi;
    await saveSettings({ ...settings, selection_auto_ask_ai: next });
    setAutoAskAi(next);
  }, [autoAskAi]);

  useEffect(() => {
    if (!popup || !autoAskAi || askingAi || aiAnswer) {
      return;
    }
    const key = `${popup.selectedText}\n${popup.cfiRange}\n${selectedPromptId}`;
    if (key === lastAutoAskKey) {
      return;
    }
    setLastAutoAskKey(key);
    setPopupMode('ai');
    void askAi();
  }, [aiAnswer, askAi, askingAi, autoAskAi, lastAutoAskKey, popup, selectedPromptId]);

  const closePromptEditor = useCallback(() => {
    setEditingPromptId(null);
    setEditingPromptContent('');
  }, []);

  return {
    aiAnswer,
    aiQuestion,
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
    popupMode,
    promptProfiles,
    resetPopupTools,
    savePrompt,
    savedWord,
    selectedPromptId,
    autoAskAi,
    setAiAnswer,
    setAiQuestion,
    toggleAutoAskAi,
    setPopup,
    setPopupMode,
    setSelectedPromptId,
  };
}
