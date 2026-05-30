import { type ReaderDisplaySettings } from '@/components/reader/readerTypes';
import { getSystemThemeId } from '@/lib/themes';

// Fixed pixel constants. Keep these in sync with the reader chrome classes.
export const HEADER_H = 48;
export const FOOTER_H = 28;
export const ANKI_W = 384;
export const PAGE_TURN_EDGE_W = 72;
export const LOCATION_BREAK_CHARS = 950;

export const READER_FONT_STACK =
  'ui-serif, Georgia, "Iowan Old Style", "Songti SC", "STSong", "Noto Serif CJK SC", serif';

export const getInitialDisplay = (): ReaderDisplaySettings => ({
  fontSize: 18,
  lineHeight: 1.5,
  themeId: getSystemThemeId(),
  pageMode: 'single',
});
