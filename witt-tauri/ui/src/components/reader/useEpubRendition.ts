import ePub, { type EpubNavigationItem } from 'epubjs';
import { useEffect, type MutableRefObject } from 'react';
import { getBookFile, getProgress, saveProgress } from '@/lib/commands';
import { applyHighlights, type HighlightToken } from '@/lib/readerText';
import { LOCATION_BREAK_CHARS, PAGE_TURN_EDGE_W } from '@/components/reader/readerConstants';
import {
  applyReaderTypography,
  expandRangeToWord,
  getCaretRangeFromPoint,
  installReaderDocumentStyles,
  locationToPage,
  type pageInfoFromLocation,
  sectionStartCfi,
  tocItems,
  type EpubContents,
  type Rendition,
  type ReaderMemoryStyleOptions,
} from '@/components/reader/readerEpub';
import { loadCustomTheme, themeById, type ReaderTheme } from '@/lib/themes';
import { type ReaderDisplaySettings } from './readerTypes';

export type EpubBook = ReturnType<typeof ePub>;

interface UseEpubRenditionArgs {
  bookId: string;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  display: ReaderDisplaySettings;
  displayRef: MutableRefObject<ReaderDisplaySettings>;
  epubBookRef: MutableRefObject<EpubBook | null>;
  knownWordsRef: MutableRefObject<HighlightToken[]>;
  memoryStyleRef: MutableRefObject<ReaderMemoryStyleOptions>;
  nextPage: () => void;
  onOpenRangePopup: (contents: EpubContents, range: Range, cfiRange?: string) => void;
  onOpenSelectionPopup: (contents: EpubContents) => void;
  onOpenToc: () => void;
  onUpdatePageInfo: (location: Parameters<typeof pageInfoFromLocation>[0]) => void;
  prevPage: () => void;
  renditionRef: MutableRefObject<Rendition | null>;
  setStatus: (status: string) => void;
  setToc: (toc: EpubNavigationItem[]) => void;
  setTocPages: (pages: Record<string, number>) => void;
  theme: ReaderTheme;
  closePopup: () => void;
}

export function useEpubRendition({
  bookId,
  containerRef,
  display,
  displayRef,
  epubBookRef,
  knownWordsRef,
  memoryStyleRef,
  nextPage,
  onOpenRangePopup,
  onOpenSelectionPopup,
  onOpenToc,
  onUpdatePageInfo,
  prevPage,
  renditionRef,
  setStatus,
  setToc,
  setTocPages,
  theme,
  closePopup,
}: UseEpubRenditionArgs) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    let disposed = false;
    let roCleanup: (() => void) | undefined;
    const contentCleanups: Array<() => void> = [];

    const openWordPopupAtPoint = (contents: EpubContents, event: MouseEvent) => {
      const caretRange = getCaretRangeFromPoint(contents.document, event.clientX, event.clientY);
      const range = caretRange ? expandRangeToWord(caretRange) : null;
      if (!range) {
        closePopup();
        return;
      }

      const selection = contents.window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      onOpenRangePopup(contents, range);
    };

    const load = async () => {
      setStatus('Opening...');
      const [bytes, progress] = await Promise.all([getBookFile(bookId), getProgress(bookId)]);
      if (disposed) {
        return;
      }

      const epubBook = ePub(new Uint8Array(bytes).buffer);
      epubBookRef.current = epubBook;

      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (disposed) {
        return;
      }
      const width = Math.floor(container.clientWidth / 2) * 2;
      const height = container.clientHeight;

      const rendition = epubBook.renderTo(container, {
        width,
        height,
        flow: 'paginated',
        spread: displayRef.current.pageMode === 'double' ? 'always' : 'none',
        minSpreadWidth: 0,
        allowScriptedContent: false,
      }) as Rendition;
      renditionRef.current = rendition;

      const observer = new ResizeObserver(([entry]) => {
        const { width: nextWidth, height: nextHeight } = entry.contentRect;
        if (nextWidth > 0 && nextHeight > 0) {
          rendition.resize(Math.floor(nextWidth), nextHeight);
        }
      });
      observer.observe(container);
      roCleanup = () => observer.disconnect();

      const seenDocs = new WeakSet<Document>();

      rendition.hooks.content.register((contents) => {
        const readerContents = contents as EpubContents;
        const win = readerContents.window;
        const doc = readerContents.document;

        if (!seenDocs.has(doc)) {
          seenDocs.add(doc);
          let lastPolledSelection = '';

          const isContextClick = (event: MouseEvent | PointerEvent) =>
            event.button === 2 || event.ctrlKey;

          const openContextMenu = (event: MouseEvent | PointerEvent) => {
            event.preventDefault();
            event.stopPropagation();

            const selection = win.getSelection();
            if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
              onOpenSelectionPopup(readerContents);
              return;
            }
            openWordPopupAtPoint(readerContents, event);
          };

          let selectionTimer: number | undefined;
          const scheduleSelectionPopup = (delay = 120) => {
            if (selectionTimer) {
              window.clearTimeout(selectionTimer);
            }
            selectionTimer = window.setTimeout(() => {
              const selection = win.getSelection();
              if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
                onOpenSelectionPopup(readerContents);
              }
            }, delay);
          };

          doc.addEventListener(
            'contextmenu',
            (event: MouseEvent) => {
              openContextMenu(event);
            },
            true
          );

          doc.addEventListener(
            'mousedown',
            (event: MouseEvent) => {
              if (isContextClick(event)) {
                openContextMenu(event);
                return;
              }
              closePopup();
            },
            true
          );

          doc.addEventListener(
            'pointerdown',
            (event: PointerEvent) => {
              if (isContextClick(event)) {
                openContextMenu(event);
              }
            },
            true
          );

          doc.addEventListener('selectionchange', () => {
            scheduleSelectionPopup();
          });

          doc.addEventListener('mouseup', (event: MouseEvent) => {
            if (isContextClick(event)) {
              openContextMenu(event);
              return;
            }
            if (event.button !== 0) {
              return;
            }
            window.setTimeout(() => onOpenSelectionPopup(readerContents), 0);
          });

          doc.addEventListener('dblclick', (event: MouseEvent) => {
            window.setTimeout(() => {
              const selection = win.getSelection();
              if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
                onOpenSelectionPopup(readerContents);
                return;
              }
              openWordPopupAtPoint(readerContents, event);
            }, 0);
          });

          doc.addEventListener('touchend', () => {
            window.setTimeout(() => onOpenSelectionPopup(readerContents), 0);
          });

          const selectionPoll = window.setInterval(() => {
            if (disposed) {
              return;
            }
            const selection = win.getSelection();
            const selectedText = selection?.toString().trim() ?? '';
            if (selectedText === lastPolledSelection) {
              return;
            }

            lastPolledSelection = selectedText;
            if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
              onOpenSelectionPopup(readerContents);
              return;
            }
            if (!selectedText) {
              closePopup();
            }
          }, 250);
          contentCleanups.push(() => window.clearInterval(selectionPoll));

          doc.addEventListener(
            'click',
            (event: MouseEvent) => {
              const target = event.target;
              const el = target instanceof Element ? target : null;
              const highlight = el?.closest('.witt-highlight');
              if (highlight) {
                event.preventDefault();
                event.stopPropagation();
                const range = doc.createRange();
                range.selectNodeContents(highlight);
                onOpenRangePopup(
                  readerContents,
                  range,
                  readerContents.cfiFromRange?.(range, 'witt-highlight') ?? ''
                );
                return;
              }
              if (el?.closest('a, button, input, textarea, select, [role="button"]')) {
                return;
              }
              const selection = win.getSelection();
              if (selection && !selection.isCollapsed) {
                return;
              }
              closePopup();

              const iframe = win.frameElement;
              if (!(iframe instanceof HTMLIFrameElement)) {
                return;
              }
              const frameRect = iframe.getBoundingClientRect();
              const x = event.clientX;

              event.preventDefault();
              event.stopPropagation();

              if (x <= PAGE_TURN_EDGE_W) {
                prevPage();
                return;
              }
              if (x >= frameRect.width - PAGE_TURN_EDGE_W) {
                nextPage();
                return;
              }
              onOpenToc();
            },
            true
          );

          doc.addEventListener('keydown', (event: KeyboardEvent) => {
            document.dispatchEvent(
              new KeyboardEvent('keydown', {
                key: event.key,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey,
                bubbles: true,
              })
            );
          });
        }

        applyHighlights(readerContents.document, knownWordsRef.current);
        installReaderDocumentStyles(
          readerContents.document,
          themeById(displayRef.current.themeId, loadCustomTheme()),
          memoryStyleRef.current
        );
      });

      rendition.on('relocated', (location) => {
        onUpdatePageInfo(location);
        const cfi = location.start?.cfi;
        if (!cfi) {
          return;
        }
        void saveProgress({
          book_id: bookId,
          epub_cfi: cfi,
          chapter_href: location.start?.href ?? null,
          progress_percent: location.start?.percentage ?? 0,
          updated_at: new Date().toISOString(),
        });
      });

      rendition.on('selected', (cfiRange: string, contents: EpubContents) => {
        const selection = contents.window.getSelection();
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
          return;
        }
        onOpenRangePopup(contents, selection.getRangeAt(0), cfiRange);
      });

      await epubBook.ready;
      const navigation = await epubBook.loaded.navigation;
      setToc(navigation.toc);
      await rendition.display(progress?.epub_cfi ?? undefined);
      applyReaderTypography(
        rendition,
        displayRef.current,
        themeById(displayRef.current.themeId, loadCustomTheme())
      );
      setStatus('Paginating...');
      await epubBook.locations.generate(LOCATION_BREAK_CHARS);
      if (disposed) {
        return;
      }
      const totalLocations = epubBook.locations.length();
      const nextTocPages = Object.fromEntries(
        tocItems(navigation.toc).map((item) => {
          const section = epubBook.spine.get(item.href);
          if (!section) {
            return [item.href, 0];
          }
          const location = epubBook.locations.locationFromCfi(sectionStartCfi(section.cfiBase));
          return [item.href, locationToPage(location, totalLocations)];
        })
      );
      setTocPages(nextTocPages);
      const currentLocation = await Promise.resolve(rendition.currentLocation());
      onUpdatePageInfo(currentLocation);
      setStatus('');
    };

    void load().catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : 'Failed to open book');
    });

    return () => {
      disposed = true;
      contentCleanups.forEach((cleanup) => cleanup());
      roCleanup?.();
      renditionRef.current?.destroy();
      renditionRef.current = null;
      epubBookRef.current?.destroy();
      epubBookRef.current = null;
    };
  }, [
    bookId,
    closePopup,
    containerRef,
    display.pageMode,
    displayRef,
    epubBookRef,
    knownWordsRef,
    memoryStyleRef,
    nextPage,
    onOpenRangePopup,
    onOpenSelectionPopup,
    onOpenToc,
    onUpdatePageInfo,
    prevPage,
    renditionRef,
    setStatus,
    setToc,
    setTocPages,
  ]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) {
      return;
    }
    applyReaderTypography(rendition, display, theme);
    rendition
      .getContents()
      .forEach((contents) =>
        installReaderDocumentStyles(contents.document, theme, memoryStyleRef.current)
      );
  }, [display, memoryStyleRef, renditionRef, theme]);
}
