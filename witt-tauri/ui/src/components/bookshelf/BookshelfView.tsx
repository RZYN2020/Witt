import { open } from '@tauri-apps/plugin-dialog';
import { BookOpen, FileUp, Loader2, Trash2 } from 'lucide-react';
import type { BookRecord } from '@/lib/commands';
import { Button } from '@/components/ui/Button';

interface BookshelfViewProps {
  books: BookRecord[];
  loading: boolean;
  onImport: (sourcePath: string) => Promise<void>;
  onOpenBook: (book: BookRecord) => void;
  onRemoveBook: (bookId: string) => Promise<void>;
}

export function BookshelfView({
  books,
  loading,
  onImport,
  onOpenBook,
  onRemoveBook,
}: BookshelfViewProps) {
  const chooseBook = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: 'EPUB', extensions: ['epub'] }],
    });
    if (typeof selected === 'string') {
      await onImport(selected);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f4ee] text-slate-950">
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Witt</p>
            <h1 className="text-2xl font-semibold">Bookshelf</h1>
          </div>
          <Button variant="primary" onClick={() => void chooseBook()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={17} /> : <FileUp size={17} />}
            Import EPUB
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-8 py-8">
        {books.length === 0 ? (
          <div className="flex min-h-[62vh] items-center justify-center rounded-md border border-dashed border-slate-300 bg-white">
            <div className="max-w-md text-center">
              <BookOpen className="mx-auto mb-4 text-slate-400" size={48} />
              <h2 className="text-xl font-semibold">Start with an EPUB</h2>
              <p className="mt-2 text-slate-600">
                Imported books are copied into Witt&apos;s app data directory so the shelf remains
                stable even if the original file moves.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <article
                key={book.id}
                className="group flex min-h-48 flex-col justify-between rounded-md border border-slate-200 bg-white p-5 shadow-sm"
              >
                <button className="text-left" onClick={() => onOpenBook(book)}>
                  <div className="mb-5 flex h-16 w-12 items-center justify-center rounded bg-slate-950 text-white">
                    <BookOpen size={24} />
                  </div>
                  <h2 className="line-clamp-2 text-lg font-semibold">{book.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{book.author}</p>
                </button>
                <div className="mt-5 flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(book.updated_at).toLocaleDateString()}</span>
                  <button
                    className="rounded p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
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
