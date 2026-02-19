import { create } from 'zustand';
import type { VideoState, Subtitle } from '@/types/video';

export const useVideoStore = create<VideoState>((set) => ({
  // Playback state
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  isMuted: false,

  // Current video
  currentVideo: null,
  subtitles: [],

  // Actions
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setCurrentVideo: (video) => set({ currentVideo: video }),
  setSubtitles: (subtitles) => set({ subtitles }),

  loadSubtitles: async (file: File) => {
    const text = await file.text();
    const subtitles = parseSubRip(text);
    set({ subtitles });
  },
}));

/**
 * Parse SRT subtitle format
 */
function parseSubRip(text: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
  const blocks = text.trim().split(/\n\s*\n/);

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;

    // Skip index line
    const timeLine = lines[1];
    const match = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
    );

    if (!match) continue;

    const start =
      parseInt(match[1]) * 3600 +
      parseInt(match[2]) * 60 +
      parseInt(match[3]) +
      parseInt(match[4]) / 1000;

    const end =
      parseInt(match[5]) * 3600 +
      parseInt(match[6]) * 60 +
      parseInt(match[7]) +
      parseInt(match[8]) / 1000;

    const text = lines.slice(2).join('\n').replace(/<[^>]*>/g, '');

    subtitles.push({
      id: crypto.randomUUID(),
      start,
      end,
      text,
      position: 'bottom',
    });
  }

  return subtitles;
}
