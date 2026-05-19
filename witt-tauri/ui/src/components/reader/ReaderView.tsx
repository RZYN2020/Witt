import ePub, { type EpubNavigationItem, type EpubRendition } from 'epubjs';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  List,
  PanelRight,
  Settings,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createAnnotation,
  getBookFile,
  getProgress,
  listAnnotations,
  saveProgress,
  type BookRecord,
} from '@/lib/commands';
import { applyHighlights, getSentenceAround, normalizeWord } from '@/lib/readerText';
import { Button } from '@/components/ui/Button';
import { AnkiPanel } from '@/components/anki/AnkiPanel';
import {
  ReaderSettingsPanel,
  type ReaderDisplaySettings,
} from '@/components/reader/ReaderSettingsPanel';

interface SelectionPopup {
  x: number;
  y: number;
  word: string;
  sentence: string;
  cfiRange: string;
  chapterTitle: string;
}

interface ReaderViewProps {
  book: BookRecord;
  onBack: () => void;
}

type Rendition = EpubRendition & { resize: (w: number, h: number) => void };

// Fixed pixel constants — must match the Tailwind classes below (h-12 = 48, h-7 = 28)
const HEADER_H = 48;
const FOOTER_H = 28;
const ANKI_W = 320;

export function ReaderView({ book, onBack }: ReaderViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const knownWordsRef = useRef<string[]>([]);
  const mouseUpPosRef = useRef<{ x: number; y: number } | null>(null);
  const displayRef = useRef<ReaderDisplaySettings>({ fontSize: 18, lineHeight: 1.7, theme: 'paper' });

  const [toc, setToc] = useState<EpubNavigationItem[]>([]);
  const [knownWords, setKnownWords] = useState<string[]>([]);
  const [status, setStatus] = useState('Loading…');
  // showUI = false → immersive: header, footer, TOC, and Anki all hidden
  const [showUI, setShowUI] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [showAnki, setShowAnki] = useState(false);
  const [display, setDisplay] = useState<ReaderDisplaySettings>({ fontSize: 18, lineHeight: 1.7, theme: 'paper' });
  const [popup, setPopup] = useState<SelectionPopup | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => { knownWordsRef.current = knownWords; }, [knownWords]);
  useEffect(() => { displayRef.current = display; }, [display]);

  const bgColor = useMemo(() => {
    if (display.theme === 'dark') { return '#020617'; }
    if (display.theme === 'white') { return '#ffffff'; }
    return '#f6f4ee';
  }, [display.theme]);

  const prevPage = useCallback(() => void renditionRef.current?.prev(), []);
  const nextPage = useCallback(() => void renditionRef.current?.next(), []);

  // epub container insets — derived from UI state.
  // epub.js MUST know the exact pixel dimensions so pagination is correct.
  const epubTop    = showUI ? HEADER_H : 0;
  const epubBottom = showUI ? FOOTER_H : 0;
  const epubRight  = showUI && showAnki ? ANKI_W : 0;

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) { return; }
      if (e.key === 'ArrowLeft') { prevPage(); }
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextPage(); }
      if (e.key === 'Escape') {
        if (popup) { setPopup(null); return; }
        if (showToc) { setShowToc(false); return; }
        if (showAnki) { setShowAnki(false); return; }
        setShowUI((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevPage, nextPage, popup, showToc, showAnki]);

  // Initialize epub.js with exact container pixel dimensions
  useEffect(() => {
    const container = containerRef.current;
    if (!container) { return; }
    let disposed = false;
    let roCleanup: (() => void) | undefined;

    const load = async () => {
      setStatus('Opening…');
      const [bytes, progress] = await Promise.all([getBookFile(book.id), getProgress(book.id)]);
      if (disposed) { return; }

      const epubBook = ePub((new Uint8Array(bytes)).buffer);

      // Wait one rAF so CSS insets have been applied before we read dimensions.
      // Use an even pixel width — spread mode splits into two equal integer columns.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (disposed) { return; }
      const w = Math.floor(container.clientWidth / 2) * 2;
      const h = container.clientHeight;

      const rendition = epubBook.renderTo(container, {
        width: w,
        height: h,
        flow: 'paginated',
        spread: 'always',
        minSpreadWidth: 0,
        allowScriptedContent: false,
      }) as Rendition;
      renditionRef.current = rendition;

      // ResizeObserver keeps epub.js in sync whenever the container box changes.
      // Round down to even width so spread columns stay equal integer pixels.
      const ro = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          rendition.resize(Math.floor(width / 2) * 2, height);
        }
      });
      ro.observe(container);
      roCleanup = () => ro.disconnect();

      rendition.hooks.content.register((contents) => {
        applyHighlights(contents.document, knownWordsRef.current);
        contents.document.documentElement.style.setProperty('line-height', String(displayRef.current.lineHeight));

        // Capture mouse-up position in parent-window coords for the popup
        contents.document.addEventListener('mouseup', (e: MouseEvent) => {
          const iframe = container.querySelector('iframe');
          if (!iframe) { return; }
          const fr = iframe.getBoundingClientRect();
          mouseUpPosRef.current = { x: fr.left + e.clientX, y: fr.top + e.clientY };
        });

        // Clicking text (without selection) clears the popup
        contents.document.addEventListener('mousedown', () => setPopup(null));

        // Forward keyboard events out of iframe so arrow keys work
        contents.document.addEventListener('keydown', (e: KeyboardEvent) => {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: e.key, bubbles: true }));
        });
      });

      rendition.on('relocated', (location) => {
        const cfi = location.start?.cfi;
        if (!cfi) { return; }
        void saveProgress({
          book_id: book.id,
          epub_cfi: cfi,
          chapter_href: location.start?.href ?? null,
          progress_percent: location.start?.percentage ?? 0,
          updated_at: new Date().toISOString(),
        });
      });

      rendition.on('selected', (cfiRange: string, contents: { window: Window; document: Document }) => {
        const selected = contents.window.getSelection()?.toString().trim() ?? '';
        const word = normalizeWord(selected);
        if (!word) { return; }
        const sentence = getSentenceAround(contents.document.body.innerText ?? '', selected);
        // selected fires before mouseup in some WebView versions — wait one tick
        setTimeout(() => {
          const pos = mouseUpPosRef.current;
          const iframe = containerRef.current?.querySelector('iframe');
          const fr = iframe?.getBoundingClientRect();
          // Fallback: use the selection rect inside the iframe
          const sel = contents.window.getSelection();
          const rect = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).getBoundingClientRect() : null;
          const x = pos?.x ?? (fr && rect ? fr.left + rect.left + rect.width / 2 : window.innerWidth / 2);
          const y = pos?.y ?? (fr && rect ? fr.top + rect.top : window.innerHeight / 2);
          setPopup({ x, y: y - 8, word, sentence, cfiRange, chapterTitle: contents.document.title ?? '' });
        }, 0);
      });

      await epubBook.ready;
      const navigation = await epubBook.loaded.navigation;
      setToc(navigation.toc);
      await rendition.display(progress?.epub_cfi ?? undefined);
      rendition.themes.fontSize(`${displayRef.current.fontSize}px`);
      rendition.themes.override('line-height', String(displayRef.current.lineHeight));
      setStatus('');
    };

    void load().catch((err: unknown) => {
      setStatus(err instanceof Error ? err.message : 'Failed to open book');
    });

    return () => {
      disposed = true;
      roCleanup?.();
      renditionRef.current?.destroy();
      renditionRef.current = null;
    };
  }, [book.id, nextPage, prevPage]);

  useEffect(() => {
    const r = renditionRef.current;
    if (!r) { return; }
    r.themes.fontSize(`${display.fontSize}px`);
    r.themes.override('line-height', String(display.lineHeight));
    r.themes.override('color', display.theme === 'dark' ? '#f8fafc' : '#0f172a');
    r.themes.override('background', bgColor);
  }, [display, bgColor]);

  useEffect(() => {
    void listAnnotations(book.id).then((anns) => {
      setKnownWords((prev) => Array.from(new Set([...prev, ...anns.map((a) => a.word)])));
    });
  }, [book.id]);

  const handleCapture = async () => {
    if (!popup || capturing) { return; }
    setCapturing(true);
    await createAnnotation({
      book_id: book.id,
      word: popup.word,
      sentence: popup.sentence,
      chapter_title: popup.chapterTitle || null,
      epub_cfi: popup.cfiRange,
    });
    setStatus(`Captured "${popup.word}"`);
    setKnownWords((prev) => Array.from(new Set([...prev, popup.word])));
    setPopup(null);
    setCapturing(false);
  };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: bgColor }}>

      {/* ── epub.js render target ──────────────────────────────────────────────
          Insets are set so epub.js sees EXACTLY the visible content area.
          ResizeObserver calls rendition.resize() whenever these change.      */}
      <div
        ref={containerRef}
        className="absolute left-0 overflow-hidden"
        style={{ top: epubTop, bottom: epubBottom, right: epubRight }}
      />

      {/* ── Page-turn hover buttons ─────────────────────────────────────────
          56px strips on each edge. pointer-events-auto on the strip;
          the chevron button fades in on hover. Narrow enough to stay
          in the margin, never covering text columns.                       */}
      <div
        className="group absolute left-0 z-10 flex cursor-pointer items-center justify-center"
        style={{ top: epubTop, bottom: epubBottom, width: 56 }}
        onClick={prevPage}
      >
        <div className="flex h-12 w-10 items-center justify-center rounded-full bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/10 group-hover:opacity-100">
          <ChevronLeft size={22} className="text-slate-700" />
        </div>
      </div>
      <div
        className="group absolute z-10 flex cursor-pointer items-center justify-center"
        style={{ top: epubTop, bottom: epubBottom, right: epubRight, width: 56 }}
        onClick={nextPage}
      >
        <div className="flex h-12 w-10 items-center justify-center rounded-full bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/10 group-hover:opacity-100">
          <ChevronRight size={22} className="text-slate-700" />
        </div>
      </div>

      {/* ── Header (fades out in immersive mode) ─────────────────────────── */}
      <header
        className={`absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between border-b border-black/10 bg-white/90 px-4 backdrop-blur-md transition-opacity duration-200 ${showUI ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Button size="sm" onClick={onBack}>
            <ArrowLeft size={16} />
            Shelf
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">{book.title}</p>
            <p className="truncate text-xs text-slate-500">{book.author}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={(e) => { e.stopPropagation(); setShowToc((v) => !v); }}>
            <List size={16} />
          </Button>
          <Button size="sm" onClick={(e) => { e.stopPropagation(); setShowAnki((v) => !v); }}>
            <PanelRight size={16} />
          </Button>
          <Button size="sm" onClick={prevPage}><ChevronLeft size={16} /></Button>
          <Button size="sm" onClick={nextPage}><ChevronRight size={16} /></Button>
          <Button size="sm" title="Immersive (Esc)" onClick={(e) => { e.stopPropagation(); setShowUI(false); }}>
            <BookOpen size={16} />
          </Button>
        </div>
      </header>

      {/* ── Footer (fades out in immersive mode) ─────────────────────────── */}
      <footer
        className={`absolute inset-x-0 bottom-0 z-20 flex h-7 items-center border-t border-black/10 bg-white/90 px-4 backdrop-blur-md transition-opacity duration-200 ${showUI ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <span className="text-xs text-slate-500">{status}</span>
      </footer>

      {/* ── TOC drawer (only when UI is visible) ─────────────────────────── */}
      {showUI && showToc && (
        <aside
          className="absolute left-0 z-30 w-72 overflow-y-auto border-r border-slate-200 bg-white shadow-2xl"
          style={{ top: HEADER_H, bottom: FOOTER_H }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Settings size={14} />
              Contents
            </p>
            {toc.map((item) => (
              <button
                key={item.href}
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100"
                onClick={() => { void renditionRef.current?.display(item.href); setShowToc(false); }}
              >
                {item.label}
              </button>
            ))}
            <ReaderSettingsPanel display={display} onDisplayChange={setDisplay} />
          </div>
        </aside>
      )}

      {/* ── Anki panel (only when UI is visible) ─────────────────────────── */}
      {showUI && showAnki && (
        <div
          className="absolute right-0 z-10 w-80 overflow-y-auto border-l border-slate-200 bg-white"
          style={{ top: HEADER_H, bottom: FOOTER_H }}
          onClick={(e) => e.stopPropagation()}
        >
          <AnkiPanel onKnownWordsChange={setKnownWords} />
        </div>
      )}

      {/* ── Selection popup ───────────────────────────────────────────────── */}
      {popup && (
        <div
          className="fixed z-50"
          style={{ left: popup.x, top: popup.y, transform: 'translateX(-50%) translateY(-100%)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-xl">
            <span className="max-w-[140px] truncate px-1 text-xs font-medium text-slate-700">
              {popup.word}
            </span>
            <button
              className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
              disabled={capturing}
              onClick={() => void handleCapture()}
            >
              {capturing ? '…' : 'Capture'}
            </button>
            <button
              className="rounded-md px-1.5 py-1 text-xs text-slate-400 hover:text-slate-700"
              onClick={() => setPopup(null)}
            >
              ✕
            </button>
          </div>
          <div className="mx-auto h-0 w-0 border-x-[5px] border-t-[6px] border-x-transparent border-t-white" />
        </div>
      )}
    </div>
  );
}
