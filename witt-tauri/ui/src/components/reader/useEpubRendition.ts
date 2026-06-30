import ePub, { type EpubLocation, type EpubNavigationItem } from 'epubjs';
import { useEffect, type MutableRefObject } from 'react';
import { getBookFile, getProgress, saveProgress } from '@/lib/commands';
import { applyHighlights, type HighlightToken } from '@/lib/readerText';
import { LOCATION_BREAK_CHARS, PAGE_TURN_EDGE_W } from '@/components/reader/readerConstants';
import {
  applyReaderTypography,
  expandRangeToWord,
  getCaretRangeFromPoint,
  installReaderDocumentStyles,
  sectionStartCfi,
  tocItems,
  type EpubContents,
  type PageEstimate,
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
  highlightVersion: number;
  knownWordsRef: MutableRefObject<HighlightToken[]>;
  memoryStyleRef: MutableRefObject<ReaderMemoryStyleOptions>;
  nextPage: () => void;
  onOpenRangePopup: (contents: EpubContents, range: Range, cfiRange?: string) => void;
  onOpenSelectionPopup: (contents: EpubContents) => void;
  onOpenToc: () => void;
  onUpdatePageInfo: (location: EpubLocation) => void;
  onLocationsReady: (estimate: PageEstimate) => void;
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
  highlightVersion,
  knownWordsRef,
  memoryStyleRef,
  nextPage,
  onOpenRangePopup,
  onOpenSelectionPopup,
  onOpenToc,
  onLocationsReady,
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
          rendition.resize(Math.floor(nextWidth / 2) * 2, nextHeight);
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
              }
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

      // Per-section epubjs location counts (proportional to character count)
      const rawSpine = epubBook.spine as { spineItems?: Array<{ href: string; cfiBase: string }> };
      const spineEntries = rawSpine?.spineItems ?? [];
      const sectionLocations: Record<string, number> = {};
      for (let i = 0; i < spineEntries.length; i++) {
        const item = spineEntries[i];
        const start = epubBook.locations.locationFromCfi(sectionStartCfi(item.cfiBase)) ?? 0;
        const nextCfi = spineEntries[i + 1]?.cfiBase;
        const end = nextCfi
          ? (epubBook.locations.locationFromCfi(sectionStartCfi(nextCfi)) ?? totalLocations)
          : totalLocations;
        sectionLocations[item.href] = Math.max(0, end - start);
      }

      // Lock the pages-per-location ratio from the first rendered section.
      // This ratio stays fixed so the total never changes.
      const currentLocation = await Promise.resolve(rendition.currentLocation());
      const firstHref = currentLocation.start?.href ?? '';
      const firstVisualPages = currentLocation.start?.displayed?.total ?? 0;
      const firstLocs = sectionLocations[firstHref] ?? 0;
      const pagesPerLoc = firstLocs > 0 && firstVisualPages > 0 ? firstVisualPages / firstLocs : 0;

      // Estimate every section from the locked ratio
      const estimatedSectionPages: Record<string, number> = {};
      let estimatedTotal = 0;
      for (const item of spineEntries) {
        const locs = sectionLocations[item.href] ?? 0;
        const pages = pagesPerLoc > 0 && locs > 0 ? Math.max(1, Math.round(locs * pagesPerLoc)) : 0;
        estimatedSectionPages[item.href] = pages;
        estimatedTotal += pages;
      }

      // Publish the locked estimates so ReaderView and TOC use the same numbers
      const pageEstimate: PageEstimate = { estimatedSectionPages, estimatedTotal };
      onLocationsReady(pageEstimate);

      // Build TOC page numbers from the same estimates.
      // TOC item hrefs may include fragments (e.g. "ch1.xhtml#s1"); match by spine section href.
      const nextTocPages: Record<string, number> = {};
      for (const item of tocItems(navigation.toc)) {
        const section = epubBook.spine.get(item.href);
        if (!section) {
          nextTocPages[item.href] = 0;
          continue;
        }
        let page = 0;
        for (const spineItem of spineEntries) {
          if (spineItem.href === section.href) {
            break;
          }
          page += estimatedSectionPages[spineItem.href] ?? 0;
        }
        nextTocPages[item.href] = page + 1;
      }
      setTocPages(nextTocPages);
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
    onLocationsReady,
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

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) {
      return;
    }
    rendition
      .getContents()
      .forEach((contents) => applyHighlights(contents.document, knownWordsRef.current));
  }, [highlightVersion, knownWordsRef, renditionRef]);
}
