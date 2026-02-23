import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface MediaPreviewProps {
  audioPath?: string;
  imagePath?: string;
  showControls?: boolean;
  className?: string;
}

/**
 * Media preview component for audio and image files
 */
export function MediaPreview({
  audioPath,
  imagePath,
  showControls = true,
  className,
}: MediaPreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (!audioPath) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioPath);
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.onerror = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const hasMedia = audioPath || (imagePath && !imageError);

  if (!hasMedia) {
    return null;
  }

  return (
    <div className={cn('media-preview space-y-3', className)}>
      {/* Audio Player */}
      {audioPath && showControls && (
        <div className="audio-player space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Audio
            </span>
            <button
              onClick={togglePlay}
              className={cn(
                'p-2 rounded-full transition-colors',
                isPlaying
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'
              )}
              aria-label={isPlaying ? 'Pause' : 'Play'}
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
          </div>

          {/* Audio Waveform Visualization */}
          <div className="flex items-center gap-0.5 h-8">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 bg-primary/50 rounded-full transition-all',
                  isPlaying ? 'animate-pulse' : ''
                )}
                style={{
                  height: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.05}s`,
                }}
              />
            ))}
          </div>

          <audio src={audioPath} ref={audioRef} />
        </div>
      )}

      {/* Image Preview */}
      {imagePath && !imageError && (
        <div className="image-preview space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Image
            </span>
            <button
              onClick={() => setIsImageViewerOpen(true)}
              className="p-1.5 hover:bg-accent rounded transition-colors"
              aria-label="View full size"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
          </div>

          <div
            className="relative aspect-video bg-muted rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => setIsImageViewerOpen(true)}
          >
            <img
              src={imagePath}
              alt="Context image"
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </div>
        </div>
      )}

      {/* Image Viewer Modal */}
      {isImageViewerOpen && imagePath && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsImageViewerOpen(false)}
        >
          <div className="relative max-w-5xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsImageViewerOpen(false)}
              className="absolute -top-10 right-0 p-2 text-white hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close"
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
              alt="Full size"
              className="max-w-full max-h-[85vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface MediaGalleryProps {
  items: Array<{
    id: string;
    type: 'audio' | 'image';
    path: string;
    caption?: string;
  }>;
}

/**
 * Media gallery component for displaying multiple media items
 */
export function MediaGallery({ items }: MediaGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const audioItems = items.filter((item) => item.type === 'audio');
  const imageItems = items.filter((item) => item.type === 'image');

  return (
    <div className="media-gallery space-y-4">
      {/* Audio Items */}
      {audioItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Audio Files ({audioItems.length})
          </h4>
          <div className="space-y-2">
            {audioItems.map((item) => (
              <MediaPreview
                key={item.id}
                audioPath={item.path}
                className="p-3 border border-border rounded-lg"
              />
            ))}
          </div>
        </div>
      )}

      {/* Image Items */}
      {imageItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Images ({imageItems.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {imageItems.map((item) => (
              <div
                key={item.id}
                className="aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                onClick={() => setSelectedIndex(null)}
              >
                <img
                  src={item.path}
                  alt={item.caption || `Image`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedIndex(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:bg-white/20 rounded-full"
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
              src={imageItems[selectedIndex].path}
              alt={imageItems[selectedIndex].caption || `Image ${selectedIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded"
            />
            {imageItems[selectedIndex].caption && (
              <p className="text-center text-white mt-4">{imageItems[selectedIndex].caption}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
