import { motion } from 'framer-motion';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { formatDate, getLanguageName } from '@/lib/utils';
import type { Card } from '@/types';
import { cn } from '@/lib/utils';

interface CardPreviewProps {
  card: Card;
  compact?: boolean;
}

/**
 * Card preview component for grid/list items
 */
export function CardPreview({ card, compact = false }: CardPreviewProps) {
  const { selectedCards, selectCard } = useLibraryStore();
  const isSelected = selectedCards.has(card.id);

  const handleClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      selectCard(card.id, e.shiftKey);
    } else {
      selectCard(card.id, false);
    }
  };

  const getSourceIcon = () => {
    switch (card.source.type) {
      case 'web':
        return '🌐';
      case 'video':
        return '🎬';
      case 'pdf':
        return '📄';
      case 'app':
        return '💻';
    }
  };

  const getSourceDisplay = () => {
    switch (card.source.type) {
      case 'web':
        return card.source.title;
      case 'video':
        return `${card.source.filename} • ${card.source.timestamp}`;
      case 'pdf':
        return `${card.source.filename}${card.source.page ? ` p.${card.source.page}` : ''}`;
      case 'app':
        return card.source.name;
    }
  };

  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={cn(
          'flex items-center gap-4 cursor-pointer transition-colors',
          isSelected && 'bg-accent'
        )}
      >
        {/* Word badge */}
        <div className="flex-shrink-0 w-32">
          <div className="text-lg font-semibold text-foreground truncate">
            {card.word}
          </div>
          {card.lemma !== card.word && (
            <div className="text-xs text-muted-foreground italic">
              {card.lemma}
            </div>
          )}
        </div>

        {/* Context preview */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">{card.context}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>{getSourceIcon()} {getSourceDisplay()}</span>
            <span>•</span>
            <span>{formatDate(card.createdAt)}</span>
          </div>
        </div>

        {/* Tags */}
        {card.tags.length > 0 && (
          <div className="flex-shrink-0 flex gap-1">
            {card.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-accent text-accent-foreground rounded"
              >
                {tag}
              </span>
            ))}
            {card.tags.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{card.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Language */}
        <div className="flex-shrink-0 w-16 text-right">
          <span className="text-xs text-muted-foreground">
            {getLanguageName(card.language)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      onClick={handleClick}
      className={cn(
        'bg-card border border-border rounded-lg p-4 cursor-pointer transition-all',
        'hover:border-ring',
        isSelected && 'ring-2 ring-ring border-transparent'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {card.word}
          </h3>
          {card.lemma !== card.word && (
            <p className="text-xs text-muted-foreground italic">
              {card.lemma}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-muted rounded">
            {getLanguageName(card.language)}
          </span>
        </div>
      </div>

      {/* Context preview */}
      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {card.context}
      </p>

      {/* Tags */}
      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {card.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 bg-accent text-accent-foreground rounded"
            >
              {tag}
            </span>
          ))}
          {card.tags.length > 4 && (
            <span className="text-xs text-muted-foreground">
              +{card.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border gap-2">
        <span className="flex items-center gap-1 flex-1 min-w-0">
          <span className="flex-shrink-0">{getSourceIcon()}</span>
          <span className="truncate">{getSourceDisplay()}</span>
        </span>
        <span className="flex-shrink-0 whitespace-nowrap">{formatDate(card.createdAt)}</span>
      </div>
    </motion.div>
  );
}
