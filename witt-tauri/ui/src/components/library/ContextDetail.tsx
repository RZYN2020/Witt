import React from 'react';
import type { Context } from '@/types';
import { cn } from '@/lib/utils';

interface ContextDetailProps {
  context: Context;
  index: number;
  totalCount: number;
  onEdit?: () => void;
  onDelete?: () => void;
  isEditable?: boolean;
}

/**
 * Context detail component showing full context information
 */
export function ContextDetail({
  context,
  index,
  totalCount,
  onEdit,
  onDelete,
  isEditable = false,
}: ContextDetailProps) {
  const audioPath = typeof context.audio === 'string' ? context.audio : context.audio?.file_path;
  const imagePath = typeof context.image === 'string' ? context.image : context.image?.file_path;

  return (
    <div
      className={cn(
        'context-detail border rounded-lg p-4 space-y-3',
        isEditable && 'hover:border-primary/50 transition-colors'
      )}
      role="listitem"
    >
      {/* Context Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 text-xs font-semibold bg-primary text-primary-foreground rounded-full">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-foreground">{context.word_form}</span>
        </div>
        <div className="flex items-center gap-2">
          {audioPath && <AudioPlayer audioPath={audioPath} />}
          {imagePath && <ImageViewer imagePath={imagePath} />}
          {isEditable && (
            <>
              <button
                onClick={onEdit}
                className="p-1 hover:bg-accent rounded transition-colors"
                title="Edit context"
                aria-label="Edit context"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={onDelete}
                className="p-1 hover:bg-destructive/20 text-destructive rounded transition-colors"
                title="Delete context"
                aria-label="Delete context"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Context Sentence */}
      <div className="context-sentence p-3 bg-muted/50 rounded-lg">
        <p className="text-sm text-foreground leading-relaxed">{context.sentence}</p>
      </div>

      {/* Source Information */}
      <div className="context-source flex items-center gap-2 text-xs text-muted-foreground">
        <SourceBadge source={context.source} />
        <span>{formatDate(context.created_at)}</span>
      </div>

      {/* Progress Indicator */}
      <div className="context-progress flex items-center gap-1 pt-2 border-t border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn('h-1 flex-1 rounded-full', i < totalCount ? 'bg-primary' : 'bg-muted')}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-2">{totalCount} / 5 contexts</span>
      </div>
    </div>
  );
}

interface AudioPlayerProps {
  audioPath: string;
}

function AudioPlayer({ audioPath }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioPath);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <button
      onClick={togglePlay}
      className={cn(
        'p-1 rounded transition-colors',
        isPlaying ? 'bg-primary/20 text-primary' : 'hover:bg-accent'
      )}
      title="Play audio"
      aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
    >
      {isPlaying ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}

interface ImageViewerProps {
  imagePath: string;
}

function ImageViewer({ imagePath }: ImageViewerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1 hover:bg-accent rounded transition-colors"
        title="View image"
        aria-label="View image"
      >
        <svg
          className="w-4 h-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsOpen(false)}
              className="absolute -top-8 right-0 p-2 text-white hover:bg-white/20 rounded"
              aria-label="Close image viewer"
            >
              <svg
                className="w-6 h-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            <img
              src={imagePath}
              alt="Context image"
              className="max-w-full max-h-[85vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </>
  );
}

interface SourceBadgeProps {
  source: Context['source'];
}

function SourceBadge({ source }: SourceBadgeProps) {
  const icon = getSourceIcon(source.type);
  const label = getSourceLabel(source);

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-xs">
      {icon}
      {label}
    </span>
  );
}

function getSourceIcon(type: Context['source']['type']) {
  switch (type) {
    case 'web':
      return '🌐';
    case 'video':
      return '🎬';
    case 'pdf':
      return '📄';
    case 'app':
      return '📱';
    default:
      return '📌';
  }
}

function getSourceLabel(source: Context['source']): string {
  switch (source.type) {
    case 'web':
      return source.title || new URL(source.url).hostname;
    case 'video':
      return source.filename;
    case 'pdf':
      return source.filename;
    case 'app':
      return source.name;
    default:
      return 'Unknown';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
