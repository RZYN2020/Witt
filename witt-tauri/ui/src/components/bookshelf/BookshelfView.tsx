import { open } from '@tauri-apps/plugin-dialog';
import { BookOpen, Clock3, FileUp, Library, Loader2, Trash2 } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { BookRecord } from '@/lib/commands';
import { loadEpubCoverUrl } from '@/lib/epubCover';
import { Button } from '@/components/ui/Button';

interface BookshelfViewProps {
  books: BookRecord[];
  loading: boolean;
  onImport: (sourcePath: string) => Promise<void>;
  onOpenBook: (book: BookRecord) => void;
  onRemoveBook: (bookId: string) => Promise<void>;
}

const LIBRARY_FILTERS = ['Reading', 'Finished', 'Unread'];

function BookCover({
  book,
  coverUrl,
  fallback,
}: {
  book?: BookRecord;
  coverUrl?: string;
  fallback: ReactNode;
}) {
  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-muted text-muted-foreground">
      {book && coverUrl ? (
        <img className="h-full w-full object-cover" src={coverUrl} alt="" />
      ) : (
        fallback
      )}
    </div>
  );
}

function LibraryFilterChip({ active, children }: { active?: boolean; children: ReactNode }) {
  return (
    <span
      className={
        active
          ? 'rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground'
          : 'rounded-full border border-border px-3 py-1 text-xs text-muted-foreground'
      }
    >
      {children}
    </span>
  );
}

export function BookshelfView({
  books,
  loading,
  onImport,
  onOpenBook,
  onRemoveBook,
}: BookshelfViewProps) {
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const recentBook = useMemo(
    () =>
      [...books].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )[0],
    [books]
  );

  useEffect(() => {
    let disposed = false;
    const urls: string[] = [];
    setCoverUrls({});

    void Promise.all(
      books.map(async (book) => {
        try {
          const url = await loadEpubCoverUrl(book);
          if (url) {
            urls.push(url);
          }
          return [book.id, url] as const;
        } catch {
          return [book.id, ''] as const;
        }
      })
    ).then((entries) => {
      if (!disposed) {
        setCoverUrls(Object.fromEntries(entries));
      }
    });

    return () => {
      disposed = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [books]);

  const chooseBook = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'EPUB', extensions: ['epub'] }],
    });
    if (typeof selected === 'string') {
      await onImport(selected);
    }
  };
  const bookCountLabel = `${books.length} ${books.length === 1 ? 'book' : 'books'}`;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-card/80 px-4 py-5 backdrop-blur sm:px-8 sm:py-7">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Witt</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reading workspace</h1>
            </div>
            <Button
              variant="primary"
              aria-label="Import EPUB"
              onClick={() => void chooseBook()}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={17} /> : <FileUp size={17} />}
              Import
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.15fr_0.85fr]">
            <button
              type="button"
              className="group flex min-h-28 items-center gap-4 rounded-md border border-border/70 bg-background p-4 text-left shadow-sm shadow-black/5 transition-colors hover:border-muted-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-default disabled:hover:border-border/70 dark:shadow-black/20"
              disabled={!recentBook}
              onClick={() => recentBook && onOpenBook(recentBook)}
            >
              <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-border bg-muted text-muted-foreground shadow-sm">
                <BookCover
                  book={recentBook}
                  coverUrl={recentBook ? coverUrls[recentBook.id] : ''}
                  fallback={<Clock3 size={20} />}
                />
              </div>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Clock3 size={13} />
                  Continue
                </p>
                <h2 className="mt-1 truncate text-base font-semibold">
                  {recentBook ? recentBook.title : 'Import a book to begin'}
                </h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {recentBook
                    ? recentBook.author || 'Unknown author'
                    : 'Your recent reading will appear here.'}
                </p>
              </div>
            </button>

            <div className="rounded-md border border-border/70 bg-background p-4 shadow-sm shadow-black/5 dark:shadow-black/20">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Library size={13} />
                Library
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <LibraryFilterChip active>All {books.length}</LibraryFilterChip>
                {LIBRARY_FILTERS.map((filter) => (
                  <LibraryFilterChip key={filter}>{filter}</LibraryFilterChip>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Bookshelf</h2>
          <p className="text-sm text-muted-foreground">{bookCountLabel}</p>
        </div>
        {books.length === 0 ? (
          <div className="flex min-h-[58vh] items-center justify-center rounded-md border border-dashed border-border bg-card/60 px-6">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md border border-border bg-background">
                <BookOpen className="text-muted-foreground" size={28} />
              </div>
              <h2 className="text-xl font-semibold">Start with an EPUB</h2>
              <p className="mt-2 text-muted-foreground">
                Imported books are copied into Witt&apos;s app data directory so your shelf remains
                stable even if the original file moves.
              </p>
              <Button
                className="mt-5"
                variant="primary"
                onClick={() => void chooseBook()}
                disabled={loading}
              >
                {loading ? <Loader2 className="animate-spin" size={17} /> : <FileUp size={17} />}
                Import EPUB
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {books.map((book) => (
              <article
                key={book.id}
                className="group flex min-h-72 flex-col rounded-md border border-transparent bg-card p-3 shadow-sm shadow-black/5 transition-all hover:-translate-y-0.5 hover:border-border hover:shadow-md dark:shadow-black/25"
              >
                <button
                  type="button"
                  className="flex flex-1 flex-col rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  onClick={() => onOpenBook(book)}
                >
                  <div className="flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted text-muted-foreground shadow-sm">
                    <BookCover
                      book={book}
                      coverUrl={coverUrls[book.id]}
                      fallback={<BookOpen size={26} />}
                    />
                  </div>
                  <div className="min-w-0 pt-3">
                    <h2 className="line-clamp-2 text-base font-semibold leading-snug">
                      {book.title}
                    </h2>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {book.author || 'Unknown author'}
                    </p>
                  </div>
                </button>
                <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(book.updated_at).toLocaleDateString()}</span>
                  <button
                    type="button"
                    className="rounded p-2 text-muted-foreground opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 group-hover:opacity-100 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                    onClick={() => void onRemoveBook(book.id)}
                    aria-label={`Remove ${book.title}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
