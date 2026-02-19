import { motion } from 'framer-motion';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useCaptureStore } from '@/stores/useCaptureStore';
import { X, Pencil, Trash2, Film } from 'lucide-react';
import { formatDate, getLanguageName } from '@/lib/utils';
import { cn } from '@/lib/utils';

/**
 * Card detail panel for viewing full card information
 */
export function CardDetail() {
  const { cards, selectedCards, deselectAll, deleteCard } = useLibraryStore();
  const { openPopup } = useCaptureStore();

  // Get the first selected card (detail view shows one at a time)
  const cardId = Array.from(selectedCards)[0];
  const card = cards.find((c) => c.id === cardId);

  if (!card) return null;

  // Check if this is a video source
  const isVideoSource = card.source.type === 'video';

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      deleteCard(card.id);
      deselectAll();
    }
  };

  const handleEdit = () => {
    openPopup(card.context, card.source);
    // Pre-fill with existing data
    const { updateCapture } = useCaptureStore.getState();
    updateCapture({
      word: card.word,
      lemma: card.lemma,
      language: card.language,
      tags: card.tags,
      notes: card.notes,
      definitions: card.definitions,
    });
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
        return (
          <a
            href={card.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {card.source.title}
          </a>
        );
      case 'video':
        return (
          <span>
            {card.source.filename} • {card.source.timestamp}
          </span>
        );
      case 'pdf':
        return (
          <span>
            {card.source.filename}
            {card.source.page && ` p.${card.source.page}`}
          </span>
        );
      case 'app':
        return <span>{card.source.name}</span>;
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={cn(
        'fixed right-0 top-0 h-full w-full max-w-2xl bg-card border-l border-border shadow-2xl z-50',
        'flex flex-col'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getSourceIcon()}</span>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {card.word}
            </h2>
            {card.lemma !== card.word && (
              <p className="text-sm text-muted-foreground italic">
                {card.lemma}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEdit}
            className="p-2 hover:bg-accent rounded transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-destructive/20 text-destructive rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={deselectAll}
            className="p-2 hover:bg-accent rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Context */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Context
          </h3>
          <p className="text-foreground bg-muted/50 rounded-lg p-4">
            {card.context}
          </p>
        </section>

        {/* Source */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Source
          </h3>
          <div className="text-foreground bg-muted/50 rounded-lg p-4">
            {getSourceDisplay()}
          </div>
          
          {/* Video Preview for video sources */}
          {isVideoSource && card.source.type === 'video' && (
            <div className="mt-4">
              <VideoPreview filename={card.source.filename} timestamp={card.source.timestamp} />
            </div>
          )}
        </section>

        {/* Definitions */}
        {card.definitions.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Definitions
            </h3>
            <div className="space-y-2">
              {card.definitions.map((def) => (
                <div
                  key={def.id}
                  className="bg-muted/50 rounded-lg p-4 border-l-4 border-primary"
                >
                  <p className="text-foreground">{def.text}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <span>{def.source}</span>
                    {def.partOfSpeech && (
                      <>
                        <span>•</span>
                        <span>{def.partOfSpeech}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tags */}
        {card.tags.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-accent text-accent-foreground text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {card.notes && (
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Notes
            </h3>
            <p className="text-foreground bg-muted/50 rounded-lg p-4">
              {card.notes}
            </p>
          </section>
        )}

        {/* Metadata */}
        <section className="pt-6 border-t border-border">
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <span className="block mb-1">Language</span>
              <span className="text-foreground">
                {getLanguageName(card.language)}
              </span>
            </div>
            <div>
              <span className="block mb-1">Created</span>
              <span className="text-foreground">
                {formatDate(card.createdAt)}
              </span>
            </div>
            {card.updatedAt && (
              <div>
                <span className="block mb-1">Updated</span>
                <span className="text-foreground">
                  {formatDate(card.updatedAt)}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

/**
 * Video preview component for video source cards
 */
function VideoPreview({ filename, timestamp }: { filename: string; timestamp: string }) {
  return (
    <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center group">
      {/* Placeholder content */}
      <div className="flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-4 group-hover:bg-muted/30 transition-colors">
          <Film className="w-10 h-10 text-muted-foreground" />
        </div>
        <p className="text-foreground font-medium text-sm">{filename}</p>
        <p className="text-muted-foreground text-xs mt-1 font-mono">{timestamp}</p>
        <p className="text-muted-foreground text-xs mt-4 px-3 py-1.5 bg-muted/20 rounded-full">
          Video file not available in mock mode
        </p>
      </div>
      
      {/* Play button overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
