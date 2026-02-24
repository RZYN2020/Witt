import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useInboxStore } from '@/stores/useInboxStore';
import type { InboxItem } from '@/types';
import { ProcessContextDialog } from './ProcessContextDialog.tsx';
import { InboxHelpDialog } from './InboxHelpDialog';
import { cn } from '@/lib/utils';

function sourceLabel(item: InboxItem): string {
  const s = item.source;
  if (s.type === 'web') return s.title || 'Web';
  if (s.type === 'video') return s.filename || 'Video';
  if (s.type === 'pdf') return s.filename || 'PDF';
  if (s.type === 'app') return s.title ? `${s.name}: ${s.title}` : s.name;
  return 'Unknown';
}

function sourceTypeLabel(type: string | null): string {
  if (!type) return 'All sources';
  if (type === 'web') return 'Web';
  if (type === 'video') return 'Video';
  if (type === 'pdf') return 'PDF';
  if (type === 'app') return 'App';
  return type;
}

function highlightText(text: string, term: string): JSX.Element | string {
  const q = term.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="bg-yellow-400/20 text-foreground rounded px-0.5">{match}</mark>
      {after}
    </>
  );
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return '';
  const idx = iso.indexOf('T');
  return idx > 0 ? iso.slice(0, idx) : iso;
}

function dateToCapturedAfter(date: string): string | null {
  const d = date.trim();
  if (!d) return null;
  return `${d}T00:00:00.000Z`;
}

function dateToCapturedBefore(date: string): string | null {
  const d = date.trim();
  if (!d) return null;
  return `${d}T23:59:59.999Z`;
}

export function InboxPage() {
  const {
    items,
    isLoading,
    error,
    currentPage,
    pageSize,
    total,
    searchTerm,
    sourceType,
    processedFilter,
    capturedAfter,
    capturedBefore,
    selected,
    unprocessedCount,
    loadItems,
    refreshUnprocessedCount,
    setSearchTerm,
    setSourceType,
    setProcessedFilter,
    setCapturedAfter,
    setCapturedBefore,
    setPageSize,
    goToPage,
    loadMore,
    select,
    deselect,
    clearSelection,
    selectAll,
    deleteItem,
    deleteItems,
    setProcessed,
    clearProcessed,
  } = useInboxStore();

  const [processingTarget, setProcessingTarget] = useState<InboxItem | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    void loadItems({ page: 0 });
    void refreshUnprocessedCount();
  }, [loadItems, refreshUnprocessedCount]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  const canPrev = currentPage > 0;
  const canNext = (currentPage + 1) * pageSize < total;

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const bulkDelete = async () => {
    await deleteItems(selectedIds);
    clearSelection();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-border px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold">Inbox</div>
          <div className="text-xs text-muted-foreground">
            Unprocessed: {unprocessedCount}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => loadItems({ page: currentPage })}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
            Help
          </Button>
          <select
            className="h-9 px-2 rounded-md border border-border bg-background text-sm"
            value={processedFilter}
            onChange={(e) =>
              setProcessedFilter(e.target.value as 'unprocessed' | 'all' | 'processed')
            }
          >
            <option value="unprocessed">Unprocessed</option>
            <option value="all">All</option>
            <option value="processed">Processed</option>
          </select>
          <Button variant="outline" size="sm" onClick={clearProcessed} disabled={processedFilter !== 'all'}>
            Clear processed
          </Button>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-4 border-b border-border flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 h-10 px-3 rounded-md border border-border bg-background text-sm"
            placeholder="Search context…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="h-10 px-3 rounded-md border border-border bg-background text-sm"
            value={sourceType || ''}
            onChange={(e) => setSourceType(e.target.value || null)}
          >
            <option value="">{sourceTypeLabel(null)}</option>
            <option value="web">{sourceTypeLabel('web')}</option>
            <option value="video">{sourceTypeLabel('video')}</option>
            <option value="pdf">{sourceTypeLabel('pdf')}</option>
            <option value="app">{sourceTypeLabel('app')}</option>
          </select>
          <input
            type="date"
            className="h-10 px-3 rounded-md border border-border bg-background text-sm"
            value={isoToDateInput(capturedAfter)}
            onChange={(e) => setCapturedAfter(dateToCapturedAfter(e.target.value))}
          />
          <input
            type="date"
            className="h-10 px-3 rounded-md border border-border bg-background text-sm"
            value={isoToDateInput(capturedBefore)}
            onChange={(e) => setCapturedBefore(dateToCapturedBefore(e.target.value))}
          />
          <select
            className="h-10 px-3 rounded-md border border-border bg-background text-sm"
            value={String(pageSize)}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[5, 10, 20, 50, 100].map((n) => (
              <option key={n} value={String(n)}>
                {n}/page
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Page {currentPage + 1} / {totalPages} · Total {total}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => goToPage(currentPage - 1)}>
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={!canNext} onClick={() => goToPage(currentPage + 1)}>
              Next
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between bg-muted/40 border border-border rounded-md px-3 py-2">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selected.size === items.length && items.length > 0}
              onChange={(e) => {
                if (e.target.checked) {
                  selectAll();
                } else {
                  clearSelection();
                }
              }}
            />
            <div className="text-xs text-muted-foreground">
              {selected.size > 0 ? `Selected: ${selectedIds.length}` : 'Select all'}
            </div>
          </div>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearSelection}>
                Clear selection
              </Button>
              <Button variant="primary" size="sm" onClick={bulkDelete}>
                Delete selected
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-3 py-2 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No items.</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const checked = selected.has(item.id);
              const captured = new Date(item.captured_at).toLocaleString();

              return (
                <div
                  key={item.id}
                  className={cn(
                    'bg-card border border-border rounded-lg p-4',
                    item.processed ? 'opacity-80' : ''
                  )}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) select(item.id, true);
                        else deselect(item.id);
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{sourceLabel(item)}</div>
                          <div className="text-xs text-muted-foreground">{captured}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!item.processed ? (
                            <Button size="sm" variant="primary" onClick={() => setProcessingTarget(item)}>
                              Process
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setProcessed(item.id, false)}
                            >
                              Restore
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteItem(item.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-foreground whitespace-pre-wrap max-h-32 overflow-hidden">
                        {highlightText(item.context, searchTerm)}
                      </div>

                      {item.processing_notes && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {item.processing_notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {canNext && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={loadMore} disabled={isLoading}>
                  {isLoading ? 'Loading…' : 'Load more'}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ProcessContextDialog
        item={processingTarget}
        open={!!processingTarget}
        onClose={() => setProcessingTarget(null)}
      />
      <InboxHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
