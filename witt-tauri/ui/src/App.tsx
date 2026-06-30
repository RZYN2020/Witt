import { Suspense, lazy, useEffect, useState } from 'react';
import { BookshelfView } from '@/components/bookshelf/BookshelfView';
import {
  getBook,
  importBook,
  listBooks,
  openReaderWindow,
  removeBook,
  type BookRecord,
} from '@/lib/commands';

const readerBookId = new URLSearchParams(window.location.search).get('reader');
const ReaderView = lazy(() =>
  import('@/components/reader/ReaderView').then((module) => ({ default: module.ReaderView }))
);

function ReaderFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <p className="text-sm text-muted-foreground">Opening reader...</p>
    </main>
  );
}

/**
 * Main application component
 */
function App() {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookRecord | null>(null);
  const [readerBook, setReaderBook] = useState<BookRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => {
      document.documentElement.classList.toggle('dark', media.matches);
    };

    applySystemTheme();
    media.addEventListener('change', applySystemTheme);
    return () => media.removeEventListener('change', applySystemTheme);
  }, []);

  useEffect(() => {
    if (readerBookId) {
      void loadReaderBook(readerBookId);
      return;
    }
    void refreshBooks();
  }, []);

  const loadReaderBook = async (bookId: string) => {
    setLoading(true);
    try {
      const book = await getBook(bookId);
      if (!book) {
        setError('Book not found');
        return;
      }
      setReaderBook(book);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to open reader');
    } finally {
      setLoading(false);
    }
  };

  const refreshBooks = async () => {
    setLoading(true);
    try {
      setBooks(await listBooks());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load bookshelf');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (source: string | File) => {
    setLoading(true);
    try {
      const book = await importBook(source);
      const nextBooks = await listBooks();
      setBooks(nextBooks);
      await handleOpenBook(book);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to import EPUB');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (bookId: string) => {
    await removeBook(bookId);
    await refreshBooks();
  };

  const handleOpenBook = async (book: BookRecord) => {
    try {
      await openReaderWindow(book.id);
    } catch (caught) {
      setSelectedBook(book);
      setError(caught instanceof Error ? caught.message : 'Opened in this window');
    }
  };

  const closeReaderWindow = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window');
      await getCurrentWindow().close();
    } catch {
      window.location.href = '/';
    }
  };

  if (readerBookId) {
    if (readerBook) {
      return (
        <Suspense fallback={<ReaderFallback />}>
          <ReaderView book={readerBook} onBack={() => void closeReaderWindow()} />
        </Suspense>
      );
    }
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">
          {error ?? (loading ? 'Opening reader...' : '')}
        </p>
      </main>
    );
  }

  if (selectedBook) {
    return (
      <Suspense fallback={<ReaderFallback />}>
        <ReaderView
          book={selectedBook}
          onBack={() => void refreshBooks().then(() => setSelectedBook(null))}
        />
      </Suspense>
    );
  }

  return (
    <>
      <BookshelfView
        books={books}
        loading={loading}
        onImport={handleImport}
        onOpenBook={(book) => void handleOpenBook(book)}
        onRemoveBook={handleRemove}
      />
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-md bg-red-600 px-4 py-2 text-sm text-white shadow-lg">
          {error}
        </div>
      )}
    </>
  );
}

export default App;
