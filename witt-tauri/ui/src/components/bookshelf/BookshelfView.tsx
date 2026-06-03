import { open } from '@tauri-apps/plugin-dialog';
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  FileUp,
  Library,
  Loader2,
  MessageSquareText,
  Search,
  StickyNote,
  Trash2,
  Upload,
} from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  getProgress,
  listAnnotations,
  listAnkiDecks,
  listMeaningGroups,
  listWordOccurrences,
  listVocabulary,
  type Annotation,
  type AnkiDeck,
  type BookRecord,
  type MeaningGroup,
  type ReadingProgress,
  type VocabularyEntry,
  type WordOccurrence,
} from '@/lib/commands';
import { loadEpubCoverUrl } from '@/lib/epubCover';
import { Button } from '@/components/ui/Button';

interface BookshelfViewProps {
  books: BookRecord[];
  loading: boolean;
  onImport: (sourcePath: string) => Promise<void>;
  onOpenBook: (book: BookRecord) => void;
  onRemoveBook: (bookId: string) => Promise<void>;
}

type WorkspaceView = 'library' | 'annotations' | 'vocabulary';
type LibraryFilter = 'All' | 'Reading' | 'Finished' | 'Unread';

const LIBRARY_FILTERS: LibraryFilter[] = ['All', 'Reading', 'Finished', 'Unread'];
const IMPORT_OPTIONS = ['TXT file', 'Markdown file', 'Clipboard text', 'Web article'];

export function BookshelfView({
  books,
  loading,
  onImport,
  onOpenBook,
  onRemoveBook,
}: BookshelfViewProps) {
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [view, setView] = useState<WorkspaceView>('library');
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('All');
  const [query, setQuery] = useState('');
  const [progressByBook, setProgressByBook] = useState<Record<string, ReadingProgress | null>>({});
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);
  const [contextWord, setContextWord] = useState<VocabularyEntry | null>(null);
  const [contexts, setContexts] = useState<WordOccurrence[]>([]);
  const [meanings, setMeanings] = useState<MeaningGroup[]>([]);
  const [decks, setDecks] = useState<AnkiDeck[]>([]);
  const [showImportMenu, setShowImportMenu] = useState(false);

  const recentBook = useMemo(
    () =>
      [...books].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )[0],
    [books]
  );
  const selectedDeck = decks.find((deck) => deck.selected);
  const queuedAnnotations = annotations.filter((annotation) => annotation.status !== 'synced');
  const learningCount = vocabulary.filter((entry) => entry.status === 'learning').length;
  const knownCount = vocabulary.filter((entry) => entry.status === 'known').length;
  const searchPlaceholder =
    view === 'annotations'
      ? 'Search annotations'
      : view === 'vocabulary'
        ? 'Search vocabulary'
        : 'Search library';
  const bookCountLabel = `${books.length} ${books.length === 1 ? 'book' : 'books'}`;

  const visibleBooks = useMemo(
    () =>
      books.filter((book) => {
        const matchesFilter = bookMatchesFilter(progressByBook[book.id], libraryFilter);
        const haystack = `${book.title} ${book.author}`.toLowerCase();
        return matchesFilter && haystack.includes(query.toLowerCase());
      }),
    [books, libraryFilter, progressByBook, query]
  );
  const visibleAnnotations = useMemo(
    () =>
      annotations.filter((annotation) =>
        `${annotation.word} ${annotation.sentence} ${annotation.chapter_title ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [annotations, query]
  );
  const visibleVocabulary = useMemo(
    () =>
      vocabulary.filter((entry) =>
        `${entry.display_word} ${entry.status} ${entry.source} ${entry.deck_name ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [query, vocabulary]
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

  useEffect(() => {
    void Promise.all([
      listAnnotations().catch(() => []),
      listVocabulary().catch(() => []),
      listAnkiDecks().catch(() => []),
      Promise.all(
        books.map((book) => getProgress(book.id).then((progress) => [book.id, progress] as const))
      ),
    ]).then(([nextAnnotations, nextVocabulary, nextDecks, progressEntries]) => {
      setAnnotations(nextAnnotations);
      setVocabulary(nextVocabulary);
      setDecks(nextDecks);
      setProgressByBook(Object.fromEntries(progressEntries));
    });
  }, [books]);

  const chooseBook = async () => {
    setShowImportMenu(false);
    const selected = await open({
      multiple: false,
      filters: [{ name: 'EPUB', extensions: ['epub'] }],
    });
    if (typeof selected === 'string') {
      await onImport(selected);
    }
  };
  const viewContexts = async (entry: VocabularyEntry) => {
    setContextWord(entry);
    const [nextContexts, nextMeanings] = await Promise.all([
      listWordOccurrences(entry.display_word).catch(() => []),
      listMeaningGroups(entry.display_word).catch(() => []),
    ]);
    setContexts(nextContexts);
    setMeanings(nextMeanings);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70 bg-card/80 px-4 py-5 backdrop-blur sm:px-8 sm:py-7">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Witt</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Reading workspace</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <WorkspaceNavButton active={view === 'library'} onClick={() => setView('library')}>
                <Library size={16} />
                Books
              </WorkspaceNavButton>
              <WorkspaceNavButton
                active={view === 'annotations'}
                onClick={() => setView('annotations')}
              >
                <StickyNote size={16} />
                Annotations
              </WorkspaceNavButton>
              <WorkspaceNavButton
                active={view === 'vocabulary'}
                onClick={() => setView('vocabulary')}
              >
                <CheckCircle2 size={16} />
                Vocabulary
              </WorkspaceNavButton>
              <ImportMenu
                disabled={loading}
                loading={loading}
                open={showImportMenu}
                onChooseBook={() => void chooseBook()}
                onToggle={() => setShowImportMenu((value) => !value)}
              />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.9fr]">
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

            <DashboardPanel icon={<Library size={13} />} title="Library">
              <div className="flex flex-wrap gap-2">
                {LIBRARY_FILTERS.map((filter) => (
                  <LibraryFilterChip
                    key={filter}
                    active={libraryFilter === filter}
                    onClick={() => {
                      setView('library');
                      setLibraryFilter(filter);
                    }}
                  >
                    {filter} {countBooksByFilter(books, progressByBook, filter)}
                  </LibraryFilterChip>
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel icon={<CheckCircle2 size={13} />} title="Learning">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <Metric label="Learning" value={learningCount} />
                <Metric label="Known" value={knownCount} />
                <Metric label="Pending" value={queuedAnnotations.length} />
              </div>
              <p className="mt-3 truncate text-xs text-muted-foreground">
                {selectedDeck ? `Anki deck: ${selectedDeck.name}` : 'No Anki deck selected'}
              </p>
            </DashboardPanel>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {view === 'annotations'
                ? 'Annotations'
                : view === 'vocabulary'
                  ? 'Vocabulary'
                  : 'Bookshelf'}
            </h2>
            {view === 'library' && (
              <p className="mt-1 text-sm text-muted-foreground">{bookCountLabel}</p>
            )}
          </div>
          <label className="flex min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <Search size={15} className="text-muted-foreground" />
            <input
              className="min-w-0 bg-transparent outline-none"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        {view === 'annotations' ? (
          <AnnotationsView annotations={visibleAnnotations} />
        ) : view === 'vocabulary' ? (
          <VocabularyView
            vocabulary={visibleVocabulary}
            onViewContexts={(entry) => void viewContexts(entry)}
          />
        ) : books.length === 0 ? (
          <EmptyLibrary loading={loading} onImport={() => void chooseBook()} />
        ) : (
          <BookGrid
            books={visibleBooks}
            coverUrls={coverUrls}
            onOpenBook={onOpenBook}
            onRemoveBook={onRemoveBook}
          />
        )}
      </section>
      {contextWord && (
        <ContextPanel
          contexts={contexts}
          meanings={meanings}
          word={contextWord}
          onClose={() => {
            setContextWord(null);
            setContexts([]);
            setMeanings([]);
          }}
        />
      )}
    </main>
  );
}

function BookGrid({
  books,
  coverUrls,
  onOpenBook,
  onRemoveBook,
}: {
  books: BookRecord[];
  coverUrls: Record<string, string>;
  onOpenBook: (book: BookRecord) => void;
  onRemoveBook: (bookId: string) => Promise<void>;
}) {
  if (books.length === 0) {
    return <EmptyPanel icon={<BookOpen size={24} />} title="No books match this view" />;
  }
  return (
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
              <h2 className="line-clamp-2 text-base font-semibold leading-snug">{book.title}</h2>
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
  );
}

function AnnotationsView({ annotations }: { annotations: Annotation[] }) {
  if (annotations.length === 0) {
    return <EmptyPanel icon={<StickyNote size={24} />} title="No annotations yet" />;
  }
  return (
    <div className="grid gap-3">
      {annotations.map((annotation) => (
        <article key={annotation.id} className="rounded-md border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold">{annotation.word}</h3>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {annotation.status}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{annotation.sentence}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {annotation.chapter_title || 'Untitled chapter'} ·{' '}
            {new Date(annotation.updated_at).toLocaleDateString()}
          </p>
        </article>
      ))}
    </div>
  );
}

function VocabularyView({
  vocabulary,
  onViewContexts,
}: {
  vocabulary: VocabularyEntry[];
  onViewContexts: (entry: VocabularyEntry) => void;
}) {
  if (vocabulary.length === 0) {
    return <EmptyPanel icon={<CheckCircle2 size={24} />} title="No vocabulary yet" />;
  }
  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      <div className="grid grid-cols-[1fr_6rem_6rem_8rem_7rem] border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Word</span>
        <span>Status</span>
        <span>Contexts</span>
        <span>Source</span>
        <span></span>
      </div>
      {vocabulary.map((entry) => (
        <div
          key={entry.normalized_word}
          className="grid grid-cols-[1fr_6rem_6rem_8rem_7rem] items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{entry.display_word}</p>
            <p className="truncate text-xs text-muted-foreground">
              {entry.deck_name || entry.model_name || entry.last_seen_at || 'Local vocabulary'}
            </p>
          </div>
          <span className="text-sm capitalize text-muted-foreground">{entry.status}</span>
          <span className="text-sm text-muted-foreground">{entry.occurrence_count}</span>
          <span className="truncate text-sm text-muted-foreground">{entry.source}</span>
          <Button size="sm" variant="ghost" onClick={() => onViewContexts(entry)}>
            <MessageSquareText size={14} />
            Contexts
          </Button>
        </div>
      ))}
    </div>
  );
}

function ContextPanel({
  contexts,
  meanings,
  word,
  onClose,
}: {
  contexts: WordOccurrence[];
  meanings: MeaningGroup[];
  word: VocabularyEntry;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/20 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vocabulary-context-title"
      onClick={onClose}
    >
      <div
        className="ml-auto flex h-full max-w-xl flex-col rounded-md border border-border bg-background shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contexts
              </p>
              <h2 id="vocabulary-context-title" className="mt-1 truncate text-lg font-semibold">
                {word.display_word}
              </h2>
              {word.cached_meaning && (
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {word.cached_meaning}
                </p>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {meanings.length > 0 && (
            <section className="mb-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Meanings
              </p>
              {meanings.map((meaning) => (
                <article key={meaning.id} className="rounded-md border border-border bg-card p-3">
                  <p className="whitespace-pre-wrap text-sm leading-6">{meaning.meaning}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {meaning.source} · {new Date(meaning.updated_at).toLocaleDateString()}
                  </p>
                </article>
              ))}
            </section>
          )}
          {contexts.length === 0 ? (
            <EmptyPanel icon={<MessageSquareText size={24} />} title="No saved contexts yet" />
          ) : (
            <div className="space-y-3">
              {contexts.map((context) => (
                <article key={context.id} className="rounded-md border border-border bg-card p-3">
                  <p className="text-sm leading-6">{context.sentence}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {context.chapter_title || 'Untitled chapter'} ·{' '}
                    {new Date(context.created_at).toLocaleDateString()}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ImportMenu({
  disabled,
  loading,
  open,
  onChooseBook,
  onToggle,
}: {
  disabled: boolean;
  loading: boolean;
  open: boolean;
  onChooseBook: () => void;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Button
        variant="primary"
        aria-label="Open import menu"
        onClick={onToggle}
        disabled={disabled}
      >
        {loading ? <Loader2 className="animate-spin" size={17} /> : <FileUp size={17} />}
        Import
        <ChevronDown size={15} />
      </Button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-card p-1 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={onChooseBook}
          >
            <Upload size={15} />
            EPUB file
          </button>
          {IMPORT_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-muted-foreground"
              disabled
            >
              <FileText size={15} />
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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

function DashboardPanel({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-background p-4 shadow-sm shadow-black/5 dark:shadow-black/20">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function WorkspaceNavButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active
          ? 'inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground'
          : 'inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function LibraryFilterChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground'
          : 'rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
      }
    >
      {children}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-lg font-semibold leading-none">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyLibrary({ loading, onImport }: { loading: boolean; onImport: () => void }) {
  return (
    <div className="flex min-h-[58vh] items-center justify-center rounded-md border border-dashed border-border bg-card/60 px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-md border border-border bg-background">
          <BookOpen className="text-muted-foreground" size={28} />
        </div>
        <h2 className="text-xl font-semibold">Start with an EPUB</h2>
        <p className="mt-2 text-muted-foreground">
          Imported books are copied into Witt&apos;s app data directory so your shelf remains stable
          even if the original file moves.
        </p>
        <Button className="mt-5" variant="primary" onClick={onImport} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={17} /> : <FileUp size={17} />}
          Import EPUB
        </Button>
      </div>
    </div>
  );
}

function EmptyPanel({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex min-h-72 items-center justify-center rounded-md border border-dashed border-border bg-card/60">
      <div className="text-center text-muted-foreground">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md border border-border bg-background">
          {icon}
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
    </div>
  );
}

function countBooksByFilter(
  books: BookRecord[],
  progressByBook: Record<string, ReadingProgress | null>,
  filter: LibraryFilter
) {
  return books.filter((book) => bookMatchesFilter(progressByBook[book.id], filter)).length;
}

function bookMatchesFilter(progress: ReadingProgress | null | undefined, filter: LibraryFilter) {
  const value = progress?.progress_percent ?? 0;
  if (filter === 'Reading') {
    return value > 0 && value < 0.95;
  }
  if (filter === 'Finished') {
    return value >= 0.95;
  }
  if (filter === 'Unread') {
    return value <= 0;
  }
  return true;
}
