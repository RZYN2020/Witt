import { useMemo } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { motion } from 'framer-motion';
import { Layers, BookOpen, Tag } from 'lucide-react';
import type { Note } from '@/types';
import { cn } from '@/lib/utils';

/**
 * Deck view - displays notes grouped by different decks
 */
export function DeckView() {
  const { notes, setDeckFilter } = useLibraryStore();

  // Group notes by deck
  const decks = useMemo(() => {
    const deckMap = new Map<string, Note[]>();

    notes.forEach((note: Note) => {
      const existing = deckMap.get(note.deck) || [];
      existing.push(note);
      deckMap.set(note.deck, existing);
    });

    return Array.from(deckMap.entries()).map(([deckName, deckNotes]) => ({
      name: deckName,
      count: deckNotes.length,
      totalContexts: deckNotes.reduce((sum: number, n: Note) => sum + n.contexts.length, 0),
      notes: deckNotes,
      tags: Array.from(new Set(deckNotes.flatMap((n: Note) => n.tags))),
    }));
  }, [notes]);

  const handleDeckClick = (deckName: string) => {
    console.log('Deck clicked:', deckName);
    setDeckFilter(deckName);
    alert(
      `Filtering to deck: ${deckName}\n\nNote: To view filtered notes, please switch to the Inbox tab.`
    );
  };

  if (decks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Layers className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No Decks Yet</h2>
          <p className="text-muted-foreground">
            Notes you capture will be automatically grouped into decks
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Decks</h1>
        <p className="text-muted-foreground">
          {decks.length} deck{decks.length !== 1 ? 's' : ''} • {notes.length} total notes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map((deck) => (
          <DeckCard key={deck.name} deck={deck} onClick={() => handleDeckClick(deck.name)} />
        ))}
      </div>
    </div>
  );
}

interface DeckCardProps {
  deck: {
    name: string;
    count: number;
    totalContexts: number;
    notes: Note[];
    tags: string[];
  };
  onClick?: () => void;
}

function DeckCard({ deck, onClick }: DeckCardProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={handleClick}
      className={cn(
        'bg-card border border-border rounded-lg p-5 cursor-pointer',
        'hover:shadow-lg hover:border-primary/50 transition-all duration-200',
        'active:scale-98'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-lg">{deck.name}</h3>
            <p className="text-sm text-muted-foreground">
              {deck.count} note{deck.count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Layers className="w-4 h-4" />
            <span>
              {deck.totalContexts} context{deck.totalContexts !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Tag className="w-4 h-4" />
            <span>
              {deck.tags.length} tag{deck.tags.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Sample notes preview */}
        {deck.notes.length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Sample notes:</p>
            <div className="flex flex-wrap gap-1">
              {deck.notes.slice(0, 5).map((note) => (
                <span
                  key={note.lemma}
                  className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded"
                >
                  {note.lemma}
                </span>
              ))}
              {deck.notes.length > 5 && (
                <span className="text-xs text-muted-foreground">+{deck.notes.length - 5} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <button className="w-full py-2 text-sm text-primary hover:bg-primary/5 rounded transition-colors">
          View Deck
        </button>
      </div>
    </motion.div>
  );
}
