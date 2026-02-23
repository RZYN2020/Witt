import { create } from 'zustand';
import type { VideoState, Subtitle } from '@/types/video';
import * as commands from '@/lib/commands';
import { useToastStore } from './useToastStore';
import { useLoadingStore } from './useLoadingStore';
import { classifyError, getUserFriendlyMessage, logError } from '@/lib/errors';
import { withLoading } from '@/lib/loading';

export interface VideoCapture {
  lemma: string;
  definition: string;
  sentence: string;
  timestamp: string;
  frame?: number;
  audioPath?: string;
  imagePath?: string;
}

interface VideoSlice extends VideoState {
  // Video capture state for Note-Context model
  currentCaptures: VideoCapture[];
  isCapturing: boolean;
  captureLemma: string | null;

  // Actions
  addCapture: (capture: VideoCapture) => void;
  clearCaptures: () => void;
  saveCaptures: (deck?: string) => Promise<boolean>;
  setIsCapturing: (capturing: boolean) => void;
  setCaptureLemma: (lemma: string | null) => void;
}

export const useVideoStore = create<VideoSlice>((set, get) => ({
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

  // Video capture state
  currentCaptures: [],
  isCapturing: false,
  captureLemma: null,

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

  // Note-Context capture actions
  addCapture: (capture) => {
    set((state) => ({
      currentCaptures: [...state.currentCaptures, capture],
    }));

    useToastStore.getState().addToast({
      message: `Captured: ${capture.lemma}`,
      type: 'success',
      duration: 2000,
    });
  },

  clearCaptures: () => {
    set({ currentCaptures: [], captureLemma: null });
  },

  saveCaptures: async (deck = 'Default') => {
    const { currentCaptures, currentVideo } = get();

    if (currentCaptures.length === 0) {
      useToastStore.getState().addToast({
        message: 'No captures to save',
        type: 'info',
        duration: 2000,
      });
      return false;
    }

    set({ isCapturing: true });
    useLoadingStore.getState().setLoading(true);

    try {
      let successCount = 0;

      for (const capture of currentCaptures) {
        await withLoading(
          async () => {
            const context = {
              id: crypto.randomUUID(),
              word_form: capture.lemma,
              sentence: capture.sentence,
              audio: capture.audioPath,
              image: capture.imagePath,
              source: {
                type: 'video' as const,
                filename: currentVideo?.filename || 'unknown.mp4',
                timestamp: capture.timestamp,
                frame: capture.frame,
              },
              created_at: new Date().toISOString(),
            };

            const request = {
              lemma: capture.lemma,
              definition: capture.definition,
              pronunciation: undefined,
              phonetics: undefined,
              tags: ['video', 'captured'],
              comment: '',
              deck,
              context,
            };

            await commands.saveNote(request);
            successCount++;
          },
          { minDisplayTime: 100 }
        );
      }

      set({
        isCapturing: false,
        currentCaptures: [],
        captureLemma: null,
      });
      useLoadingStore.getState().setLoading(false);

      useToastStore.getState().addToast({
        message: `Saved ${successCount} captures`,
        type: 'success',
        duration: 3000,
      });

      return true;
    } catch (error) {
      const classifiedError = classifyError(error);
      logError(classifiedError, 'saveCaptures');

      const userMessage = getUserFriendlyMessage(classifiedError);

      set({ isCapturing: false });
      useLoadingStore.getState().setLoading(false);

      useToastStore.getState().addToast({
        message: userMessage,
        type: 'error',
        duration: 4000,
      });

      return false;
    }
  },

  setIsCapturing: (capturing) => {
    set({ isCapturing: capturing });
  },

  setCaptureLemma: (lemma) => {
    set({ captureLemma: lemma });
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

    const text = lines
      .slice(2)
      .join('\n')
      .replace(/<[^>]*>/g, '');

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
