import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useVideoStore } from '@/stores/useVideoStore';
import { useCaptureStore } from '@/stores/useCaptureStore';
import { VideoControls } from './VideoControls';
import { SubtitleOverlay } from './SubtitleOverlay';
import { Timeline } from './Timeline';
import { CaptureButton } from './CaptureButton';
import type { Subtitle } from '@/types/video';

interface VideoPlayerProps {
  src?: string;
  filename?: string;
  subtitles?: Subtitle[];
  onCapture?: (context: string, timestamp: string) => void;
}

/**
 * HTML5 video player with custom controls and subtitle overlay
 */
export function VideoPlayer({ src, filename, subtitles = [], onCapture }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    setIsPlaying,
    setCurrentTime,
    setDuration,
  } = useVideoStore();

  const { openPopup } = useCaptureStore();
  const [currentSubtitle, setCurrentSubtitle] = useState<Subtitle | null>(null);

  // Update current subtitle based on time
  useEffect(() => {
    if (!subtitles || subtitles.length === 0) {
      setCurrentSubtitle(null);
      return;
    }

    const active = subtitles.filter((s) => currentTime >= s.start && currentTime <= s.end);
    if (active.length === 0) {
      setCurrentSubtitle(null);
      return;
    }

    // If overlapping, show the most recent (largest start time)
    const latest = active.reduce((best, s) => (!best || s.start > best.start ? s : best), null as Subtitle | null);
    setCurrentSubtitle(latest);
  }, [currentTime, subtitles]);

  // Handle video time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, [setCurrentTime]);

  // Handle video loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, [setDuration]);

  // Handle video ended
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, [setIsPlaying]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  // Handle seek
  const handleSeek = useCallback(
    (time: number) => {
      if (!videoRef.current) return;
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    },
    [setCurrentTime]
  );

  // Handle volume change
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVolume;
  }, []);

  // Handle playback rate change
  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Handle capture
  const handleCapture = useCallback(() => {
    if (!videoRef.current || !currentSubtitle) return;

    const timestamp = formatTime(currentTime);
    const context = currentSubtitle.text;

    openPopup(context, {
      type: 'video',
      filename: filename || 'unknown.mp4',
      timestamp,
    });

    // Pause video on capture
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    if (onCapture) {
      onCapture(context, timestamp);
    }
  }, [currentSubtitle, currentTime, filename, openPopup, setIsPlaying, onCapture]);

  const seekToNextSubtitle = useCallback(() => {
    if (!subtitles || subtitles.length === 0) return;
    const epsilon = 0.001;
    const next = subtitles
      .filter((s) => s.start > currentTime + epsilon)
      .reduce(
        (best, s) => (!best || s.start < best.start ? s : best),
        null as Subtitle | null
      );
    if (!next) return;
    handleSeek(next.start);
    // Pause and stay paused
    if (videoRef.current) videoRef.current.pause();
    setIsPlaying(false);
  }, [subtitles, currentTime, handleSeek, setIsPlaying]);

  const seekToPrevSubtitle = useCallback(() => {
    if (!subtitles || subtitles.length === 0) return;
    const epsilon = 0.001;
    const prev = subtitles
      .filter((s) => s.start < currentTime - epsilon)
      .reduce(
        (best, s) => (!best || s.start > best.start ? s : best),
        null as Subtitle | null
      );
    if (!prev) return;
    handleSeek(prev.start);
    // Pause and stay paused
    if (videoRef.current) videoRef.current.pause();
    setIsPlaying(false);
  }, [subtitles, currentTime, handleSeek, setIsPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if video container is focused or user is interacting with video
      if (!containerRef.current?.contains(document.activeElement)) return;

      const key = e.key.toLowerCase();

      // Ctrl/Cmd shortcuts for subtitle navigation & capture
      if (e.ctrlKey || e.metaKey) {
        if (key === 'n') {
          e.preventDefault();
          seekToNextSubtitle();
          return;
        }
        if (key === 'p') {
          e.preventDefault();
          seekToPrevSubtitle();
          return;
        }
        if (key === 'c') {
          e.preventDefault();
          handleCapture();
          return;
        }
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          handleSeek(Math.max(0, currentTime - 10));
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          handleSeek(Math.min(duration, currentTime + 10));
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        // Keep plain "c" as a convenience (spec uses Ctrl+C)
        case 'c':
          if (!e.shiftKey) {
            e.preventDefault();
            handleCapture();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    togglePlay,
    handleSeek,
    handleVolumeChange,
    toggleFullscreen,
    handleCapture,
    seekToNextSubtitle,
    seekToPrevSubtitle,
    currentTime,
    duration,
    volume,
  ]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      // State update removed for simplicity
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative bg-black rounded-lg overflow-hidden group"
      tabIndex={0}
      role="application"
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onClick={togglePlay}
      />

      {/* Subtitle overlay */}
      {currentSubtitle && (
        <SubtitleOverlay
          text={currentSubtitle.text}
          position={currentSubtitle.position || 'bottom'}
        />
      )}

      {/* Capture button overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <CaptureButton onClick={handleCapture} disabled={!currentSubtitle} />
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <Timeline
          currentTime={currentTime}
          duration={duration}
          subtitles={subtitles}
          onSeek={handleSeek}
        />
        <VideoControls
          isPlaying={isPlaying}
          volume={volume}
          playbackRate={playbackRate}
          onTogglePlay={togglePlay}
          onVolumeChange={handleVolumeChange}
          onPlaybackRateChange={handlePlaybackRateChange}
          onToggleFullscreen={toggleFullscreen}
          onCapture={handleCapture}
          canCapture={!!currentSubtitle}
        />
      </div>
    </motion.div>
  );
}

/**
 * Format time as HH:MM:SS or MM:SS
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
