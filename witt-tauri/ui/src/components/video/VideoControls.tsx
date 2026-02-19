import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoControlsProps {
  isPlaying: boolean;
  volume: number;
  playbackRate: number;
  onTogglePlay: () => void;
  onVolumeChange: (volume: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleFullscreen: () => void;
  onCapture: () => void;
  canCapture: boolean;
}

export function VideoControls({
  isPlaying,
  volume,
  playbackRate,
  onTogglePlay,
  onVolumeChange,
  onPlaybackRateChange,
  onToggleFullscreen,
  onCapture,
  canCapture,
}: VideoControlsProps) {
  const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      {/* Play/Pause */}
      <button
        onClick={onTogglePlay}
        className="p-2 hover:bg-white/20 rounded transition-colors"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5 text-white" />
        ) : (
          <Play className="w-5 h-5 text-white" />
        )}
      </button>

      {/* Volume */}
      <div className="flex items-center gap-2 group">
        <button
          onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
          className="p-2 hover:bg-white/20 rounded transition-colors"
        >
          {volume === 0 ? (
            <VolumeX className="w-5 h-5 text-white" />
          ) : (
            <Volume2 className="w-5 h-5 text-white" />
          )}
        </button>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-0 group-hover:w-20 transition-all h-1 bg-white/30 rounded-full appearance-none cursor-pointer"
        />
      </div>

      {/* Playback speed */}
      <div className="relative group">
        <button className="px-2 py-1 text-xs text-white hover:bg-white/20 rounded transition-colors">
          {playbackRate}×
        </button>
        <div className="absolute bottom-full left-0 mb-2 bg-black/90 rounded-md py-1 hidden group-hover:block">
          {rates.map((rate) => (
            <button
              key={rate}
              onClick={() => onPlaybackRateChange(rate)}
              className={cn(
                'w-full px-3 py-1 text-xs text-left hover:bg-white/20 transition-colors',
                playbackRate === rate && 'bg-white/20'
              )}
            >
              {rate}×
            </button>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Capture button */}
      <button
        onClick={onCapture}
        disabled={!canCapture}
        className={cn(
          'px-3 py-1.5 text-sm rounded transition-colors',
          canCapture
            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
            : 'bg-white/20 text-white/50 cursor-not-allowed'
        )}
      >
        📖 Capture
      </button>

      {/* Fullscreen */}
      <button
        onClick={onToggleFullscreen}
        className="p-2 hover:bg-white/20 rounded transition-colors"
      >
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
        </svg>
      </button>
    </div>
  );
}
