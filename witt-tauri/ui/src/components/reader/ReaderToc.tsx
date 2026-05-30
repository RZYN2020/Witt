import { type EpubNavigationItem } from 'epubjs';
import { List, X } from 'lucide-react';

interface ReaderTocProps {
  items: EpubNavigationItem[];
  pages: Record<string, number>;
  onClose: () => void;
  onSelect: (href: string) => void;
}

interface TocItemProps {
  item: EpubNavigationItem;
  pages: Record<string, number>;
  onClose: () => void;
  onSelect: (href: string) => void;
  depth: number;
}

function TocItem({ item, pages, onSelect, onClose, depth }: TocItemProps) {
  const page = pages[item.href];

  return (
    <div>
      <button
        className="flex w-full items-center gap-3 rounded-md py-2 pr-2 text-left text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        style={{ paddingLeft: 12 + depth * 14 }}
        onClick={() => {
          onSelect(item.href);
          onClose();
        }}
      >
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">{page ? page : '-'}</span>
      </button>
      {item.subitems?.map((subitem) => (
        <TocItem
          key={subitem.href}
          item={subitem}
          pages={pages}
          onSelect={onSelect}
          onClose={onClose}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export function ReaderToc({ items, pages, onClose, onSelect }: ReaderTocProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <aside
        className="pointer-events-auto fixed left-4 top-14 max-h-[min(70vh,36rem)] w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-border/70 bg-popover/95 p-3 text-popover-foreground shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-3 px-1">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
            <List size={14} />
            Contents
          </p>
          <button
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={onClose}
            aria-label="Close contents"
          >
            <X size={15} />
          </button>
        </div>
        {items.map((item) => (
          <TocItem
            key={item.href}
            item={item}
            pages={pages}
            onSelect={onSelect}
            onClose={onClose}
            depth={0}
          />
        ))}
      </aside>
    </div>
  );
}
