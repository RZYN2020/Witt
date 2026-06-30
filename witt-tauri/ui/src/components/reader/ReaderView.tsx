import { type EpubNavigationItem } from 'epubjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSettings, listAnnotations, listVocabulary, type BookRecord } from '@/lib/commands';
import { getSentenceAround, normalizeWord, type HighlightToken } from '@/lib/readerText';
import { ProfileEditor } from '@/components/ui/ProfileEditor';
import { AnkiPanel } from '@/components/anki/AnkiPanel';
import { ReaderChrome } from '@/components/reader/ReaderChrome';
import { ReaderSettingsModal } from '@/components/reader/ReaderSettingsModal';
import { ReaderToc } from '@/components/reader/ReaderToc';
import { type ReaderDisplaySettings } from '@/components/reader/readerTypes';
import { SelectionPopup } from '@/components/reader/SelectionPopup';
import { useSelectionTools } from '@/components/reader/useSelectionTools';
import { ANKI_W, FOOTER_H, getInitialDisplay, HEADER_H } from '@/components/reader/readerConstants';
import {
  emptyPageInfo,
  pageInfoFromLocation,
  type EpubContents,
  type Rendition,
} from '@/components/reader/readerEpub';
import { type EpubBook, useEpubRendition } from '@/components/reader/useEpubRendition';
import {
  applyAppThemeCss,
  getSystemThemeId,
  loadCustomTheme,
  themeById,
  type ReaderTheme,
} from '@/lib/themes';

interface ReaderViewProps {
  book: BookRecord;
  onBack: () => void;
}

export function ReaderView({ book, onBack }: ReaderViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const epubBookRef = useRef<EpubBook | null>(null);
  const knownWordsRef = useRef<HighlightToken[]>([]);
  const memoryStyleRef = useRef({ inlineMiniGloss: false });
  const displayRef = useRef<ReaderDisplaySettings>(getInitialDisplay());
  const userChangedReaderThemeRef = useRef(false);

  const [toc, setToc] = useState<EpubNavigationItem[]>([]);
  const [tocPages, setTocPages] = useState<Record<string, number>>({});
  const [pageInfo, setPageInfo] = useState(emptyPageInfo);
  const [knownWords, setKnownWords] = useState<HighlightToken[]>([]);
  const [status, setStatus] = useState('Loading…');
  // showUI = false → immersive: header, footer, TOC, and Anki all hidden
  const [showUI, setShowUI] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [showAnki, setShowAnki] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [display, setDisplay] = useState<ReaderDisplaySettings>(getInitialDisplay);
  const [customTheme, setCustomTheme] = useState<ReaderTheme>(loadCustomTheme);
  const [visualMemoryScope, setVisualMemoryScope] = useState<'library' | 'book'>('library');
  const [inlineMiniGloss, setInlineMiniGloss] = useState(false);
  const markKnownWord = useCallback((word: string) => {
    setKnownWords((prev) => mergeHighlightTokens(prev, [{ word, status: 'learning' }]));
  }, []);
  const mergeKnownWordList = useCallback((words: string[]) => {
    setKnownWords((prev) =>
      mergeHighlightTokens(
        prev,
        words.map((word) => ({ word, status: 'learning' }))
      )
    );
  }, []);
  const selectionTools = useSelectionTools({
    bookId: book.id,
    onKnownWord: markKnownWord,
    setStatus,
  });
  const {
    aiAnswer,
    aiQuestion,
    askAi,
    askingAi,
    autoAskAi,
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
    setVocabularyStatus,
    setAiAnswer,
    setAiQuestion,
    setPopup,
    setPopupMode,
    setSelectedPromptId,
    toggleAutoAskAi,
  } = selectionTools;

  useEffect(() => {
    knownWordsRef.current = knownWords;
  }, [knownWords]);
  useEffect(() => {
    displayRef.current = display;
  }, [display]);
  useEffect(() => {
    memoryStyleRef.current = { inlineMiniGloss };
  }, [inlineMiniGloss]);

  useEffect(() => {
    void getSettings()
      .then((settings) => {
        setVisualMemoryScope(settings.visual_memory_scope);
        setInlineMiniGloss(settings.inline_mini_gloss);
      })
      .catch(() => undefined);
  }, []);

  const currentTheme = useMemo(
    () => themeById(display.themeId, customTheme),
    [customTheme, display.themeId]
  );
  const bgColor = currentTheme.background;

  const prevPage = useCallback(() => void renditionRef.current?.prev(), []);
  const nextPage = useCallback(() => void renditionRef.current?.next(), []);
  const openToc = useCallback(() => {
    setShowUI(true);
    setShowToc(true);
    setShowAnki(false);
    setPopup(null);
  }, [setPopup]);

  const handleDisplayChange = useCallback((settings: ReaderDisplaySettings) => {
    if (settings.themeId !== displayRef.current.themeId) {
      userChangedReaderThemeRef.current = true;
    }
    setDisplay(settings);
  }, []);

  const updatePageInfo = useCallback((location: Parameters<typeof pageInfoFromLocation>[0]) => {
    const total = epubBookRef.current?.locations.length() ?? 0;
    setPageInfo(pageInfoFromLocation(location, total));
  }, []);
  const closePopup = useCallback(() => setPopup(null), [setPopup]);

  const openRangePopup = useCallback(
    (contents: EpubContents, range: Range, cfiRange = '') => {
      const { document: doc, window: win } = contents;
      if (!range) {
        setPopup(null);
        return;
      }

      const text = range.toString().trim();
      if (!text) {
        setPopup(null);
        return;
      }

      const rangeRect = range.getBoundingClientRect();
      const iframeEl =
        win.frameElement instanceof HTMLIFrameElement
          ? win.frameElement
          : containerRef.current?.querySelector('iframe');
      if (!iframeEl) {
        return;
      }

      const iframeRect = iframeEl.getBoundingClientRect();
      const rect =
        rangeRect.width || rangeRect.height
          ? rangeRect
          : new DOMRect(iframeRect.width / 2, HEADER_H, 0, 0);
      const word = normalizeWord(text) || text.slice(0, 80);
      const sentence = getSentenceAround(doc.body?.innerText ?? '', text);

      resetPopupTools();
      setPopup({
        x: iframeRect.left + rect.left + rect.width / 2,
        y: iframeRect.top + rect.bottom + 6,
        selectedText: text,
        word,
        sentence,
        cfiRange: cfiRange || (contents.cfiFromRange?.(range, 'witt-highlight') ?? ''),
        chapterTitle: doc.title ?? '',
      });
    },
    [resetPopupTools, setPopup]
  );

  const openSelectionPopup = useCallback(
    (contents: EpubContents) => {
      const selection = contents.window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setPopup(null);
        return;
      }

      openRangePopup(contents, selection.getRangeAt(0));
    },
    [openRangePopup, setPopup]
  );

  // epub container insets — derived from UI state.
  // epub.js MUST know the exact pixel dimensions so pagination is correct.
  const epubTop = showUI && !immersive ? HEADER_H : 0;
  const epubBottom = showUI && !immersive ? FOOTER_H : 0;
  const epubRight = showUI && showAnki ? ANKI_W : 0;

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      const isTextEditingTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (isTextEditingTarget) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPage();
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextPage();
      }
      if (e.key === 't') {
        e.preventDefault();
        setShowUI(true);
        setShowToc((v) => !v);
      }
      if (e.key === 's') {
        e.preventDefault();
        setShowSettings((v) => !v);
      }
      if (e.key === 'a') {
        e.preventDefault();
        setShowAnki((v) => !v);
      }
      if (e.key === 'i') {
        e.preventDefault();
        setImmersive((v) => {
          setShowUI(v);
          return !v;
        });
      }
      if (e.key === 'f') {
        e.preventDefault();
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        } else {
          void document.documentElement.requestFullscreen();
        }
      }
      if (e.key === 'Escape') {
        if (popup) {
          setPopup(null);
          return;
        }
        if (showSettings) {
          setShowSettings(false);
          return;
        }
        if (showToc) {
          setShowToc(false);
          return;
        }
        if (showAnki) {
          setShowAnki(false);
          return;
        }
        if (immersive) {
          setImmersive(false);
          setShowUI(true);
          return;
        }
        setShowUI((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [immersive, prevPage, nextPage, popup, setPopup, showSettings, showToc, showAnki]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemThemeChange = () => {
      if (userChangedReaderThemeRef.current) {
        return;
      }
      setDisplay((current) => ({ ...current, themeId: getSystemThemeId() }));
    };

    media.addEventListener('change', onSystemThemeChange);
    return () => media.removeEventListener('change', onSystemThemeChange);
  }, []);

  useEffect(() => {
    applyAppThemeCss(display.themeId === 'custom' ? customTheme : { ...currentTheme, css: '' });
  }, [customTheme, currentTheme, display.themeId]);

  useEpubRendition({
    bookId: book.id,
    containerRef,
    display,
    displayRef,
    epubBookRef,
    knownWordsRef,
    memoryStyleRef,
    nextPage,
    onOpenRangePopup: openRangePopup,
    onOpenSelectionPopup: openSelectionPopup,
    onOpenToc: openToc,
    onUpdatePageInfo: updatePageInfo,
    prevPage,
    renditionRef,
    setStatus,
    setToc,
    setTocPages,
    theme: currentTheme,
    closePopup,
  });

  useEffect(() => {
    const vocabularyBookId = visualMemoryScope === 'book' ? book.id : undefined;
    void Promise.all([listAnnotations(book.id), listVocabulary(undefined, vocabularyBookId)]).then(
      ([anns, vocabulary]) => {
        const words = [
          ...anns.map((annotation) => ({ word: annotation.word, status: 'learning' as const })),
          ...vocabulary
            .filter((entry) => entry.status !== 'ignored')
            .map((entry) => ({
              word: entry.display_word,
              status: entry.status,
              meaning: entry.cached_meaning ?? undefined,
            })),
        ];
        setKnownWords(mergeHighlightTokens([], words));
      }
    );
  }, [book.id, visualMemoryScope]);

  return (
    <div
      className="witt-reader-shell fixed inset-0 overflow-hidden"
      style={{ background: bgColor }}
    >
      {/* ── epub.js render target ──────────────────────────────────────────────
          Insets are set so epub.js sees EXACTLY the visible content area.
          ResizeObserver calls rendition.resize() whenever these change.      */}
      <div
        ref={containerRef}
        className="absolute left-0 overflow-hidden"
        style={{ top: epubTop, bottom: epubBottom, right: epubRight }}
      />

      <ReaderChrome
        title={book.title}
        author={book.author}
        display={display}
        immersive={immersive}
        pageInfo={pageInfo}
        showUI={showUI}
        status={status}
        epubBottom={epubBottom}
        epubRight={epubRight}
        epubTop={epubTop}
        onBack={onBack}
        onNextPage={nextPage}
        onPrevPage={prevPage}
        onShowSettings={() => setShowSettings(true)}
        onToggleAnki={() => setShowAnki((value) => !value)}
        onToggleImmersive={() => {
          setImmersive((v) => {
            setShowUI(v);
            return !v;
          });
        }}
        onTogglePageMode={() => {
          handleDisplayChange({
            ...display,
            pageMode: display.pageMode === 'double' ? 'single' : 'double',
          });
        }}
        onToggleToc={() => setShowToc((value) => !value)}
        onRevealChrome={() => setShowUI(true)}
        onHideChrome={() => setShowUI(false)}
      />

      {/* ── Floating TOC (only when UI is visible) ───────────────────────── */}
      {showUI && showToc && (
        <ReaderToc
          items={toc}
          pages={tocPages}
          onClose={() => setShowToc(false)}
          onSelect={(href) => void renditionRef.current?.display(href)}
        />
      )}

      {/* ── Settings modal ───────────────────────────────────────────────── */}
      {showSettings && (
        <ReaderSettingsModal
          display={display}
          customTheme={customTheme}
          onClose={() => setShowSettings(false)}
          onDisplayChange={handleDisplayChange}
          onCustomThemeChange={setCustomTheme}
        />
      )}

      {/* ── Anki panel (only when UI is visible) ─────────────────────────── */}
      {showUI && showAnki && (
        <div
          className="absolute right-0 z-10 w-96 overflow-y-auto border-l border-border bg-background"
          style={{ top: HEADER_H, bottom: FOOTER_H }}
          onClick={(e) => e.stopPropagation()}
        >
          <AnkiPanel onKnownWordsChange={mergeKnownWordList} />
        </div>
      )}

      {/* ── Selection popup ───────────────────────────────────────────────── */}
      {popup && (
        <SelectionPopup
          popup={popup}
          mode={popupMode}
          savedWord={savedWord}
          saving={capturing}
          askingAi={askingAi}
          aiAnswer={aiAnswer}
          explanationState={explanationState}
          aiQuestion={aiQuestion}
          promptProfiles={promptProfiles}
          selectedPromptId={selectedPromptId}
          autoAskAi={autoAskAi}
          onClose={() => setPopup(null)}
          onSave={() => void captureSelection()}
          onAskAi={() => {
            setAiAnswer('');
            void askAi();
          }}
          onModeChange={setPopupMode}
          onQuestionChange={setAiQuestion}
          onPromptChange={setSelectedPromptId}
          onEditPrompt={() => void editPrompt()}
          onToggleAutoAskAi={() => void toggleAutoAskAi()}
          onMarkKnown={() => void setVocabularyStatus('known')}
          onIgnore={() => void setVocabularyStatus('ignored')}
        />
      )}

      {editingPromptId && (
        <ProfileEditor
          title={`Edit Prompt: ${promptProfiles.find((p) => p.id === editingPromptId)?.name ?? editingPromptId}`}
          initialContent={editingPromptContent}
          onSave={savePrompt}
          onClose={closePromptEditor}
        />
      )}
    </div>
  );
}

function mergeHighlightTokens(current: HighlightToken[], next: HighlightToken[]) {
  const byWord = new Map(current.map((token) => [token.word.trim().toLowerCase(), token]));
  for (const token of next) {
    const normalized = token.word.trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    byWord.set(normalized, { ...byWord.get(normalized), ...token });
  }
  return Array.from(byWord.values());
}
