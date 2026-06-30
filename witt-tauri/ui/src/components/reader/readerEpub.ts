import { type EpubLocation, type EpubNavigationItem, type EpubRendition } from 'epubjs';
import { READER_FONT_STACK } from '@/components/reader/readerConstants';
import { type ReaderTheme } from '@/lib/themes';

export type Rendition = EpubRendition & { resize: (w: number, h: number) => void };

export type EpubContents = {
  document: Document;
  window: Window;
  cfiFromRange?: (range: Range, ignoreClass?: string) => string;
};

export interface PageInfo {
  current: number;
  total: number;
  sectionCurrent: number;
  sectionTotal: number;
}

export interface SelectionPopupModel {
  x: number;
  y: number;
  selectedText: string;
  word: string;
  sentence: string;
  cfiRange: string;
  chapterTitle: string;
}

export interface ReaderMemoryStyleOptions {
  inlineWordDisplay: 'none' | 'status' | 'meaning';
  highlightKnownWords: boolean;
}

export const emptyPageInfo: PageInfo = {
  current: 0,
  total: 0,
  sectionCurrent: 0,
  sectionTotal: 0,
};

export const locationToPage = (location: number | undefined, total: number) => {
  if (typeof location !== 'number' || location < 0 || total <= 0) {
    return 0;
  }
  return Math.min(total, location + 1);
};

export const pageInfoFromLocation = (location: EpubLocation, total: number): PageInfo => ({
  current: locationToPage(location.start?.location, total),
  total,
  sectionCurrent: location.start?.displayed?.page ?? 0,
  sectionTotal: location.start?.displayed?.total ?? 0,
});

export const sectionStartCfi = (cfiBase: string) => `epubcfi(${cfiBase}!/4/2)`;

export const tocItems = (items: EpubNavigationItem[]): EpubNavigationItem[] =>
  items.flatMap((item) => [item, ...tocItems(item.subitems ?? [])]);

export const getCaretRangeFromPoint = (document: Document, x: number, y: number): Range | null => {
  const docWithCaretRange = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };

  const rangeFromPoint = docWithCaretRange.caretRangeFromPoint?.(x, y);
  if (rangeFromPoint) {
    return rangeFromPoint;
  }

  const position = docWithCaretRange.caretPositionFromPoint?.(x, y);
  if (!position) {
    return null;
  }

  const range = document.createRange();
  range.setStart(position.offsetNode, position.offset);
  range.collapse(true);
  return range;
};

export const expandRangeToWord = (range: Range): Range | null => {
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) {
    return null;
  }

  const text = node.textContent ?? '';
  if (!text) {
    return null;
  }

  let start = range.startOffset;
  let end = range.startOffset;
  const isWordChar = (value: string) => /[\p{L}\p{N}'-]/u.test(value);

  if (start > 0 && !isWordChar(text[start] ?? '') && isWordChar(text[start - 1] ?? '')) {
    start -= 1;
    end = start;
  }

  while (start > 0 && isWordChar(text[start - 1] ?? '')) {
    start -= 1;
  }
  while (end < text.length && isWordChar(text[end] ?? '')) {
    end += 1;
  }
  if (start === end) {
    return null;
  }

  const wordRange = range.cloneRange();
  wordRange.setStart(node, start);
  wordRange.setEnd(node, end);
  return wordRange;
};

export const applyReaderTypography = (
  rendition: Rendition,
  display: { fontSize: number; lineHeight: number },
  theme: ReaderTheme
) => {
  rendition.themes.fontSize(`${display.fontSize}px`);
  rendition.themes.override('line-height', String(display.lineHeight), true);
  rendition.themes.override('font-family', READER_FONT_STACK, true);
  rendition.themes.override('font-weight', '400', true);
  rendition.themes.override('letter-spacing', '0', true);
  rendition.themes.override('text-rendering', 'optimizeLegibility', true);
  rendition.themes.override('-webkit-font-smoothing', 'antialiased', true);
  rendition.themes.override('hyphens', 'auto', true);
  rendition.themes.override('widows', '2', true);
  rendition.themes.override('orphans', '2', true);
  rendition.themes.override('color', theme.foreground, true);
  rendition.themes.override('background', theme.background, true);
};

export const installReaderDocumentStyles = (
  document: Document,
  theme: ReaderTheme,
  memory: ReaderMemoryStyleOptions = { inlineWordDisplay: 'none', highlightKnownWords: true }
) => {
  const styleId = 'witt-reader-polish';
  const existing = document.getElementById(styleId);
  const style = existing ?? document.createElement('style');
  style.id = styleId;
  style.textContent = `
    html {
      color-scheme: ${theme.id === 'dark' ? 'dark' : 'light'};
      background: transparent !important;
      -webkit-font-smoothing: antialiased;
      -webkit-touch-callout: none;
      text-rendering: optimizeLegibility;
    }
    body {
      box-sizing: border-box;
      color: ${theme.foreground} !important;
      background: transparent !important;
      max-width: 42rem;
      margin-inline: auto !important;
      padding-inline: clamp(1.75rem, 5vw, 4.5rem) !important;
      -webkit-touch-callout: none;
    }
    body.witt-inline-word-display-status .witt-highlight::after {
      content: " " attr(data-witt-status-label);
      display: inline;
      color: color-mix(in srgb, ${theme.foreground} 55%, transparent) !important;
      font-size: 0.68em;
      font-weight: 500;
      letter-spacing: 0;
    }
    body.witt-inline-word-display-meaning .witt-highlight[data-witt-meaning]::after {
      content: " " attr(data-witt-meaning);
      display: inline;
      color: color-mix(in srgb, ${theme.foreground} 64%, transparent) !important;
      font-size: 0.72em;
      font-weight: 500;
      letter-spacing: 0;
    }
    body.witt-no-highlights .witt-highlight {
      background: transparent !important;
      color: inherit !important;
      box-shadow: none !important;
      cursor: text;
    }
    p {
      margin-block: 0 0.9em;
      hanging-punctuation: first last;
    }
    a {
      color: ${theme.link} !important;
      text-decoration-thickness: 0.06em;
      text-underline-offset: 0.16em;
    }
    ::selection {
      background: ${theme.selection};
    }
    .witt-highlight {
      color: ${theme.highlightForeground} !important;
      background: ${theme.highlightBackground} !important;
      box-shadow: 0 0 0 2px ${theme.highlightBackground} !important;
      cursor: pointer;
      border-radius: 0.12em;
    }
    .witt-highlight[data-witt-status="new"] {
      background: color-mix(in srgb, ${theme.selection} 55%, transparent) !important;
      box-shadow: inset 0 -0.18em 0 color-mix(in srgb, ${theme.link} 45%, transparent) !important;
    }
    .witt-highlight[data-witt-status="known"] {
      background: transparent !important;
      color: inherit !important;
      box-shadow: inset 0 -0.12em 0 color-mix(in srgb, ${theme.highlightBackground} 55%, transparent) !important;
    }
    .witt-highlight:hover {
      box-shadow: 0 0 0 2px ${theme.highlightBackground} !important;
    }
    ${theme.css}
  `;
  if (!existing) {
    document.head.appendChild(style);
  }
  document.body?.classList.toggle(
    'witt-inline-word-display-status',
    memory.inlineWordDisplay === 'status'
  );
  document.body?.classList.toggle(
    'witt-inline-word-display-meaning',
    memory.inlineWordDisplay === 'meaning'
  );
  document.body?.classList.toggle('witt-no-highlights', !memory.highlightKnownWords);
};
