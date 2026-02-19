import { useState, useRef, useEffect, useCallback } from 'react';
import { useVideoStore } from '@/stores/useVideoStore';
import { useCaptureStore } from '@/stores/useCaptureStore';
import { VideoUploader } from './VideoUploader';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  SkipBack, SkipForward, Upload, X, Clock 
} from 'lucide-react';

/**
 * Video library view for watching videos and capturing words
 */
export function VideoLibrary() {
  const [showUploader, setShowUploader] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
  const [currentVideoFile, setCurrentVideoFile] = useState<File | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { 
    isPlaying, currentTime, duration, volume, playbackRate,
    setIsPlaying, setCurrentTime, setDuration, setVolume, setPlaybackRate 
  } = useVideoStore();
  
  const { openPopup } = useCaptureStore();

  // Handle video selection from uploader
  const handleVideoSelect = (file: File, url: string) => {
    setCurrentVideoFile(file);
    setCurrentVideoUrl(url);
    setShowUploader(false);
    
    // Reset video state
    setIsPlaying(false);
    setCurrentTime(0);
  };

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

  // Handle time update
  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, [setCurrentTime]);

  // Handle loaded metadata
  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  }, [setDuration]);

  // Handle seek
  const handleSeek = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, [setCurrentTime]);

  // Handle volume change
  const handleVolumeChange = useCallback((newVolume: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVolume;
    setVolume(newVolume);
  }, [setVolume]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = volume === 0;
    videoRef.current.volume = newMuted ? 1 : 0;
    setVolume(newMuted ? 1 : 0);
  }, [volume, setVolume]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    handleSeek(Math.max(0, Math.min(duration, currentTime + seconds)));
  }, [currentTime, duration, handleSeek]);

  // Capture current subtitle/word
  const handleCapture = useCallback(() => {
    if (!videoRef.current) return;
    
    const timestamp = formatTime(currentTime);
    const context = `Video: ${currentVideoFile?.name || 'Unknown'} at ${timestamp}`;
    
    openPopup(context, {
      type: 'video',
      filename: currentVideoFile?.name || 'unknown.mp4',
      timestamp,
    });
    
    // Pause video on capture
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [currentTime, currentVideoFile, openPopup, setIsPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentVideoUrl) return;
      
      // Don't handle if typing in input
      if (document.activeElement?.tagName === 'INPUT') return;
      
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
        case 'j':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          skip(10);
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
        case 'c':
          if (!e.shiftKey) {
            e.preventDefault();
            handleCapture();
          }
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentVideoUrl, togglePlay, skip, handleVolumeChange, toggleFullscreen, handleCapture, toggleMute, volume]);

  // Format time display
  const formatTimeDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If no video selected, show upload prompt
  if (!currentVideoUrl) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <Upload className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            上传视频
          </h2>
          <p className="text-muted-foreground mb-6">
            支持 MP4、WebM、OGG、MOV 格式（最大 500MB）
          </p>
          <button
            onClick={() => setShowUploader(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            选择视频文件
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-black">
      {/* Video container */}
      <div 
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center"
      >
        <video
          ref={videoRef}
          src={currentVideoUrl}
          className="max-w-full max-h-full"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlay}
        />
        
        {/* Capture button overlay */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleCapture}
            className="px-4 py-2 bg-primary/90 text-primary-foreground rounded-lg hover:bg-primary transition-colors flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Capture Word
          </button>
          
          <button
            onClick={() => {
              setCurrentVideoUrl(null);
              setCurrentVideoFile(null);
            }}
            className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card border-t border-border p-4 space-y-3">
        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-12 text-right">
            {formatTimeDisplay(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="flex-1 h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
          />
          <span className="text-xs text-muted-foreground w-12">
            {formatTimeDisplay(duration)}
          </span>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => skip(-10)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Skip back 10s"
            >
              <SkipBack className="w-5 h-5 text-foreground" />
            </button>

            <button
              onClick={togglePlay}
              className="p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            <button
              onClick={() => skip(10)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Skip forward 10s"
            >
              <SkipForward className="w-5 h-5 text-foreground" />
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={toggleMute}
                className="p-2 hover:bg-accent rounded-lg transition-colors flex-shrink-0"
              >
                {volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-foreground" />
                ) : (
                  <Volume2 className="w-5 h-5 text-foreground" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-20 h-1 bg-muted rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Playback speed */}
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(Number(e.target.value))}
              className="px-3 py-1.5 text-sm bg-muted border border-border rounded-lg"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>

            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-accent rounded-lg transition-colors flex-shrink-0"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5 text-foreground" />
              ) : (
                <Maximize className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>

        {/* Video info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <span className="truncate">{currentVideoFile?.name}</span>
          <span>Press C to capture • Space to play/pause</span>
        </div>
      </div>

      {/* Upload dialog */}
      {showUploader && (
        <VideoUploader
          onVideoSelect={handleVideoSelect}
          onClose={() => setShowUploader(false)}
        />
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
