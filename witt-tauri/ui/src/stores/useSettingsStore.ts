import { create } from 'zustand';

/**
 * Settings slice state and actions
 */
interface SettingsSlice {
  // State
  theme: 'light' | 'dark' | 'system';
  captureHotkey: string;
  libraryHotkey: string;
  hotkeyEnabled: boolean;
  autoFetchDefinitions: boolean;
  includeScreenshots: boolean;
  appLanguage: 'en' | 'zh' | 'ja' | 'ko' | 'de';

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setCaptureHotkey: (hotkey: string) => void;
  setLibraryHotkey: (hotkey: string) => void;
  setHotkeyEnabled: (enabled: boolean) => void;
  setAutoFetchDefinitions: (enabled: boolean) => void;
  setIncludeScreenshots: (enabled: boolean) => void;
  setAppLanguage: (language: 'en' | 'zh' | 'ja' | 'ko' | 'de') => void;
}

export const useSettingsStore = create<SettingsSlice>((set) => ({
  theme: 'system',
  captureHotkey: 'Cmd+Shift+C',
  libraryHotkey: 'Cmd+Shift+L',
  hotkeyEnabled: true,
  autoFetchDefinitions: true,
  includeScreenshots: false,
  appLanguage: 'en',

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('witt:theme', theme);
    applyTheme(theme);
  },

  setCaptureHotkey: (hotkey) => {
    set({ captureHotkey: hotkey });
    localStorage.setItem('witt:captureHotkey', hotkey);
  },

  setLibraryHotkey: (hotkey) => {
    set({ libraryHotkey: hotkey });
    localStorage.setItem('witt:libraryHotkey', hotkey);
  },

  setHotkeyEnabled: (enabled) => {
    set({ hotkeyEnabled: enabled });
    localStorage.setItem('witt:hotkeyEnabled', String(enabled));
  },

  setAutoFetchDefinitions: (enabled) => {
    set({ autoFetchDefinitions: enabled });
    localStorage.setItem('witt:autoFetchDefinitions', String(enabled));
  },

  setIncludeScreenshots: (enabled) => {
    set({ includeScreenshots: enabled });
    localStorage.setItem('witt:includeScreenshots', String(enabled));
  },

  setAppLanguage: (language) => {
    set({ appLanguage: language });
    localStorage.setItem('witt:appLanguage', language);
  },
}));

/**
 * Apply theme to document
 */
function applyTheme(theme: 'light' | 'dark' | 'system') {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
    root.classList.toggle('dark', systemTheme === 'dark');
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// Load saved settings on initialization
const savedTheme = localStorage.getItem('witt:theme') as 'light' | 'dark' | 'system' | null;
if (savedTheme) {
  useSettingsStore.getState().theme = savedTheme;
  applyTheme(savedTheme);
}

const savedCaptureHotkey = localStorage.getItem('witt:captureHotkey');
if (savedCaptureHotkey) {
  useSettingsStore.getState().captureHotkey = savedCaptureHotkey;
}

const savedLibraryHotkey = localStorage.getItem('witt:libraryHotkey');
if (savedLibraryHotkey) {
  useSettingsStore.getState().libraryHotkey = savedLibraryHotkey;
}

const savedHotkeyEnabled = localStorage.getItem('witt:hotkeyEnabled');
if (savedHotkeyEnabled !== null) {
  useSettingsStore.getState().hotkeyEnabled = savedHotkeyEnabled === 'true';
}

const savedAutoFetch = localStorage.getItem('witt:autoFetchDefinitions');
if (savedAutoFetch !== null) {
  useSettingsStore.getState().autoFetchDefinitions = savedAutoFetch === 'true';
}

const savedScreenshots = localStorage.getItem('witt:includeScreenshots');
if (savedScreenshots !== null) {
  useSettingsStore.getState().includeScreenshots = savedScreenshots === 'true';
}

const savedLanguage = localStorage.getItem('witt:appLanguage') as 'en' | 'zh' | 'ja' | 'ko' | 'de' | null;
if (savedLanguage) {
  useSettingsStore.getState().appLanguage = savedLanguage;
}

// Listen for system theme changes
window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', () => {
    if (useSettingsStore.getState().theme === 'system') {
      applyTheme('system');
    }
  });
