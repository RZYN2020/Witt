import { useRef, useCallback } from 'react';
import type { Subtitle } from '@/types/video';

interface TimelineProps {
  currentTime: number;
  duration: number;
  subtitles: Subtitle[];
  onSeek: (time: number) => void;
}

export function Timeline({ currentTime, duration, subtitles, onSeek }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || duration === 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * duration;

    onSeek(time);
  }, [duration, onSeek]);

  // Calculate subtitle markers
  const markers = subtitles.map((s) => ({
    left: `${(s.start / duration) * 100}%`,
    width: `${((s.end - s.start) / duration) * 100}%`,
  })).filter((m) => {
    const w = parseFloat(m.width);
    return !isNaN(w) && w > 0;
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="px-4 pt-2 pb-1">
      {/* Timeline scrubber */}
      <div
        ref={timelineRef}
        onClick={handleClick}
        className="relative h-2 bg-white/20 rounded-full cursor-pointer group"
      >
        {/* Progress bar */}
        <div
          className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />

        {/* Subtitle markers */}
        {markers.map((marker, i) => (
          <div
            key={i}
            className="absolute top-0 h-full bg-white/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              left: marker.left,
              width: Math.max(parseFloat(marker.width), 2) + '%',
            }}
          />
        ))}

        {/* Current time indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Time display */}
      <div className="flex justify-between mt-1 text-xs text-white/70">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
