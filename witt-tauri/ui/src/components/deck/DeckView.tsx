import { useMemo } from 'react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { motion } from 'framer-motion';
import { Layers, BookOpen, Tag } from 'lucide-react';

/**
 * Deck view - groups cards by word/lemma for spaced repetition
 */
export function DeckView() {
  const { cards } = useLibraryStore();

  // Group cards by word to create decks
  const decks = useMemo(() => {
    const deckMap = new Map<string, typeof cards>();

    cards.forEach((card) => {
      const key = card.word.toLowerCase();
      const existing = deckMap.get(key) || [];
      existing.push(card);
      deckMap.set(key, existing);
    });

    return Array.from(deckMap.entries()).map(([word, cards]) => ({
      word,
      lemma: cards[0]?.lemma || word,
      count: cards.length,
      cards,
      language: cards[0]?.language || 'en',
      tags: Array.from(new Set(cards.flatMap(c => c.tags))),
    }));
  }, [cards]);

  if (decks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Layers className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No Decks Yet
          </h2>
          <p className="text-muted-foreground">
            Cards you capture will be automatically grouped into decks by word
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Decks</h1>
        <p className="text-muted-foreground">
          {decks.length} unique words • {cards.length} total cards
        </p>
      </div>

      {/* Deck Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decks.map((deck, index) => (
          <DeckCard key={deck.word} deck={deck} index={index} />
        ))}
      </div>
    </div>
  );
}

interface DeckCardProps {
  deck: {
    word: string;
    lemma: string;
    count: number;
    cards: any[];
    language: string;
    tags: string[];
  };
  index: number;
}

function DeckCard({ deck, index }: DeckCardProps) {
  const { selectCard } = useLibraryStore();

  const handleCardClick = (cardId: string) => {
    selectCard(cardId, false);
  };

  const getLanguageName = (code: string) => {
    const names: Record<string, string> = {
      en: 'English',
      zh: '中文',
      ja: '日本語',
      ko: '한국어',
      de: 'Deutsch',
    };
    return names[code] || code;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card border border-border rounded-xl p-5 hover:shadow-lg transition-all hover:border-ring/50"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{deck.word}</h3>
          {deck.lemma !== deck.word && (
            <p className="text-sm text-muted-foreground italic">{deck.lemma}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-muted rounded-full">
            {getLanguageName(deck.language)}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" />
          <span>{deck.count} cards</span>
        </div>
        {deck.tags.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Tag className="w-4 h-4" />
            <span>{deck.tags.length} tags</span>
          </div>
        )}
      </div>

      {/* Tags preview */}
      {deck.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {deck.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 bg-accent text-accent-foreground rounded-full"
            >
              {tag}
            </span>
          ))}
          {deck.tags.length > 4 && (
            <span className="text-xs text-muted-foreground">
              +{deck.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Cards preview */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Recent cards:</p>
        {deck.cards.slice(0, 2).map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card.id)}
            className="w-full text-left text-sm p-2 bg-muted/50 rounded hover:bg-accent/50 transition-colors truncate"
          >
            {card.context}
          </button>
        ))}
        {deck.cards.length > 2 && (
          <p className="text-xs text-muted-foreground text-center">
            +{deck.cards.length - 2} more cards
          </p>
        )}
      </div>
    </motion.div>
  );
}
