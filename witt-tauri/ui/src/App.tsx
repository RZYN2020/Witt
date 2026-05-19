import { useEffect, useState } from 'react';
import { BookshelfView } from '@/components/bookshelf/BookshelfView';
import { ReaderView } from '@/components/reader/ReaderView';
import { importBook, listBooks, removeBook, type BookRecord } from '@/lib/commands';

/**
 * Main application component
 */
function App() {
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle(
      'dark',
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }, []);

  useEffect(() => {
    void refreshBooks();
  }, []);

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

  const handleImport = async (sourcePath: string) => {
    setLoading(true);
    try {
      const book = await importBook(sourcePath);
      const nextBooks = await listBooks();
      setBooks(nextBooks);
      setSelectedBook(book);
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

  if (selectedBook) {
    return <ReaderView book={selectedBook} onBack={() => void refreshBooks().then(() => setSelectedBook(null))} />;
  }

  return (
    <>
      <BookshelfView
        books={books}
        loading={loading}
        onImport={handleImport}
        onOpenBook={setSelectedBook}
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
