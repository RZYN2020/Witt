import { create } from 'zustand';

interface HotkeyToastState {
  isVisible: boolean;
  message: string;
  show: (message: string, duration?: number) => void;
  hide: () => void;
}

export const useHotkeyToastStore = create<HotkeyToastState>((set) => ({
  isVisible: false,
  message: '',

  show: (message: string, duration = 2000) => {
    set({ isVisible: true, message });

    // Auto hide after duration
    setTimeout(() => {
      set({ isVisible: false, message: '' });
    }, duration);
  },

  hide: () => {
    set({ isVisible: false, message: '' });
  },
}));
