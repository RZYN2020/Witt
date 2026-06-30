import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Columns2,
  List,
  MessageSquare,
  PanelRight,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FOOTER_H, PAGE_TURN_EDGE_W } from '@/components/reader/readerConstants';
import { type PageInfo } from '@/components/reader/readerEpub';
import { type ReaderDisplaySettings } from '@/components/reader/readerTypes';

interface ReaderChromeProps {
  title: string;
  author: string;
  display: ReaderDisplaySettings;
  immersive: boolean;
  pageInfo: PageInfo;
  showUI: boolean;
  status: string;
  epubBottom: number;
  epubRight: number;
  epubTop: number;
  onBack: () => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  onShowSettings: () => void;
  onToggleAi: () => void;
  onToggleAnki: () => void;
  onToggleImmersive: () => void;
  onTogglePageMode: () => void;
  onToggleToc: () => void;
  onRevealChrome: () => void;
  onHideChrome: () => void;
}

function PageTurnZone({
  side,
  epubBottom,
  epubRight,
  epubTop,
  onClick,
}: {
  side: 'left' | 'right';
  epubBottom: number;
  epubRight: number;
  epubTop: number;
  onClick: () => void;
}) {
  const isLeft = side === 'left';
  const Icon = isLeft ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      aria-label={isLeft ? 'Previous page' : 'Next page'}
      className={`group absolute z-10 flex cursor-pointer items-center justify-center ${isLeft ? 'left-0' : ''}`}
      style={{
        top: epubTop,
        bottom: epubBottom,
        right: isLeft ? undefined : epubRight,
        width: PAGE_TURN_EDGE_W,
      }}
      onClick={onClick}
    >
      <div className="flex h-12 w-10 items-center justify-center rounded-full bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/10 group-hover:opacity-100 dark:group-hover:bg-white/10">
        <Icon size={22} className="text-slate-700 dark:text-slate-100" />
      </div>
    </button>
  );
}

export function ReaderChrome({
  title,
  author,
  display,
  immersive,
  pageInfo,
  showUI,
  status,
  epubBottom,
  epubRight,
  epubTop,
  onBack,
  onNextPage,
  onPrevPage,
  onShowSettings,
  onToggleAi,
  onToggleAnki,
  onToggleImmersive,
  onTogglePageMode,
  onToggleToc,
  onRevealChrome,
  onHideChrome,
}: ReaderChromeProps) {
  const pageText =
    pageInfo.total > 0
      ? `Page ${pageInfo.current || 1} / ${pageInfo.total}`
      : pageInfo.sectionTotal > 0
        ? `Section ${pageInfo.sectionCurrent || 1} / ${pageInfo.sectionTotal}`
        : '';

  return (
    <>
      <PageTurnZone
        side="left"
        epubTop={epubTop}
        epubBottom={epubBottom}
        epubRight={epubRight}
        onClick={onPrevPage}
      />
      <PageTurnZone
        side="right"
        epubTop={epubTop}
        epubBottom={epubBottom}
        epubRight={epubRight}
        onClick={onNextPage}
      />

      {immersive && !showUI && (
        <div className="fixed inset-x-0 top-0 z-30 h-16" onMouseEnter={onRevealChrome} />
      )}

      <header
        className={`absolute inset-x-0 top-0 z-20 flex h-12 items-center justify-between border-b border-border/70 bg-background/85 px-3 backdrop-blur-md transition-opacity duration-200 ${showUI ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onMouseLeave={() => {
          if (immersive) {
            onHideChrome();
          }
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            title="Contents"
            aria-label="Contents"
            onClick={(e) => {
              e.stopPropagation();
              onToggleToc();
            }}
          >
            <List size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={onBack}>
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Shelf</span>
          </Button>
          <div className="min-w-0 pl-1">
            <p className="truncate text-sm font-semibold text-foreground">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{author}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            title="Settings"
            aria-label="Settings"
            onClick={(e) => {
              e.stopPropagation();
              onShowSettings();
            }}
          >
            <Settings size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title={display.pageMode === 'double' ? 'Double page' : 'Single page'}
            aria-label="Toggle page mode"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePageMode();
            }}
          >
            <Columns2 size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="AI Chat"
            aria-label="AI Chat"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAi();
            }}
          >
            <MessageSquare size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title="Anki"
            aria-label="Anki"
            onClick={(e) => {
              e.stopPropagation();
              onToggleAnki();
            }}
          >
            <PanelRight size={16} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            title={immersive ? 'Exit immersive' : 'Immersive'}
            aria-label={immersive ? 'Exit immersive' : 'Immersive'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleImmersive();
            }}
          >
            <BookOpen size={16} />
          </Button>
        </div>
      </header>

      <footer
        className={`absolute inset-x-0 bottom-0 z-20 flex h-7 items-center border-t border-border/70 bg-background/85 px-4 backdrop-blur-md transition-opacity duration-200 ${showUI ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        style={{ height: FOOTER_H }}
      >
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{status}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{pageText}</span>
      </footer>
    </>
  );
}
