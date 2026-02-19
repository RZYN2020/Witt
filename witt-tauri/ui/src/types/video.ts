/**
 * Video-related types
 */

export interface Subtitle {
  id: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
  position?: 'top' | 'middle' | 'bottom';
}

export interface VideoFile {
  id: string;
  filename: string;
  path?: string;
  duration?: number;
  thumbnail?: string;
  lastWatched?: string;
  progress?: number; // percentage 0-100
}

export interface VideoState {
  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isMuted: boolean;

  // Current video
  currentVideo: VideoFile | null;
  subtitles: Subtitle[];

  // Actions
  setIsPlaying: (playing: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setIsMuted: (muted: boolean) => void;
  setCurrentVideo: (video: VideoFile | null) => void;
  setSubtitles: (subtitles: Subtitle[]) => void;
  loadSubtitles: (file: File) => Promise<void>;
}
