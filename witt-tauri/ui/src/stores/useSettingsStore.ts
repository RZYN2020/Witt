import { create } from 'zustand';

/**
 * Settings slice state and actions for Note-Context model
 */
interface SettingsSlice {
  // Appearance
  theme: 'light' | 'dark' | 'system';
  appLanguage: 'en' | 'zh' | 'ja' | 'ko' | 'de';
  
  // Capture settings
  captureHotkey: string;
  libraryHotkey: string;
  hotkeyEnabled: boolean;
  autoFetchDefinitions: boolean;
  includeScreenshots: boolean;
  
  // Note-Context model settings
  defaultDeck: string;
  defaultTags: string[];
  maxContextsPerNote: number; // Maximum 5 per design
  autoConsolidateDuplicates: boolean;
  
  // Anki integration settings
  ankiEnabled: boolean;
  ankiConnectUrl: string;
  autoSyncToAnki: boolean;
  ankiNoteType: string;
  ankiFieldMapping: Record<string, string>;
  
  // Data management
  dataDirectory: string;
  backupEnabled: boolean;
  backupInterval: 'daily' | 'weekly' | 'monthly';
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAppLanguage: (language: 'en' | 'zh' | 'ja' | 'ko' | 'de') => void;
  setCaptureHotkey: (hotkey: string) => void;
  setLibraryHotkey: (hotkey: string) => void;
  setHotkeyEnabled: (enabled: boolean) => void;
  setAutoFetchDefinitions: (enabled: boolean) => void;
  setIncludeScreenshots: (enabled: boolean) => void;
  setDefaultDeck: (deck: string) => void;
  setDefaultTags: (tags: string[]) => void;
  setMaxContextsPerNote: (max: number) => void;
  setAutoConsolidateDuplicates: (enabled: boolean) => void;
  setAnkiEnabled: (enabled: boolean) => void;
  setAnkiConnectUrl: (url: string) => void;
  setAutoSyncToAnki: (enabled: boolean) => void;
  setAnkiNoteType: (type: string) => void;
  setAnkiFieldMapping: (mapping: Record<string, string>) => void;
  setDataDirectory: (dir: string) => void;
  setBackupEnabled: (enabled: boolean) => void;
  setBackupInterval: (interval: 'daily' | 'weekly' | 'monthly') => void;
}

export const useSettingsStore = create<SettingsSlice>((set) => ({
  // Appearance
  theme: 'system',
  appLanguage: 'en',

  // Capture settings
  captureHotkey: 'CmdOrCtrl+G',
  libraryHotkey: 'CmdOrCtrl+L',
  hotkeyEnabled: true,
  autoFetchDefinitions: true,
  includeScreenshots: false,
  
  // Note-Context model settings
  defaultDeck: 'Default',
  defaultTags: [],
  maxContextsPerNote: 5, // Per design spec
  autoConsolidateDuplicates: true,
  
  // Anki integration settings
  ankiEnabled: false,
  ankiConnectUrl: 'http://localhost:8765',
  autoSyncToAnki: false,
  ankiNoteType: 'Witt - Basic',
  ankiFieldMapping: {
    lemma: 'Lemma',
    definition: 'Definition',
    pronunciation: 'Pronunciation',
    phonetics: 'Phonetics',
    contexts: 'Contexts',
    comment: 'Comment',
  },
  
  // Data management
  dataDirectory: '',
  backupEnabled: true,
  backupInterval: 'daily',

  setTheme: (theme) => {
    set({ theme });
    localStorage.setItem('witt:theme', theme);
    applyTheme(theme);
  },

  setAppLanguage: (language) => {
    set({ appLanguage: language });
    localStorage.setItem('witt:appLanguage', language);
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

  setDefaultDeck: (deck) => {
    set({ defaultDeck: deck });
    localStorage.setItem('witt:defaultDeck', deck);
  },

  setDefaultTags: (tags) => {
    set({ defaultTags: tags });
    localStorage.setItem('witt:defaultTags', JSON.stringify(tags));
  },

  setMaxContextsPerNote: (max) => {
    // Enforce maximum of 5 per design spec
    const clampedMax = Math.min(Math.max(1, max), 5);
    set({ maxContextsPerNote: clampedMax });
    localStorage.setItem('witt:maxContextsPerNote', String(clampedMax));
  },

  setAutoConsolidateDuplicates: (enabled) => {
    set({ autoConsolidateDuplicates: enabled });
    localStorage.setItem('witt:autoConsolidateDuplicates', String(enabled));
  },

  setAnkiEnabled: (enabled) => {
    set({ ankiEnabled: enabled });
    localStorage.setItem('witt:ankiEnabled', String(enabled));
  },

  setAnkiConnectUrl: (url) => {
    set({ ankiConnectUrl: url });
    localStorage.setItem('witt:ankiConnectUrl', url);
  },

  setAutoSyncToAnki: (enabled) => {
    set({ autoSyncToAnki: enabled });
    localStorage.setItem('witt:autoSyncToAnki', String(enabled));
  },

  setAnkiNoteType: (type) => {
    set({ ankiNoteType: type });
    localStorage.setItem('witt:ankiNoteType', type);
  },

  setAnkiFieldMapping: (mapping) => {
    set({ ankiFieldMapping: mapping });
    localStorage.setItem('witt:ankiFieldMapping', JSON.stringify(mapping));
  },

  setDataDirectory: (dir) => {
    set({ dataDirectory: dir });
    localStorage.setItem('witt:dataDirectory', dir);
  },

  setBackupEnabled: (enabled) => {
    set({ backupEnabled: enabled });
    localStorage.setItem('witt:backupEnabled', String(enabled));
  },

  setBackupInterval: (interval) => {
    set({ backupInterval: interval });
    localStorage.setItem('witt:backupInterval', interval);
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

// Migrate old shortcut keys to new defaults
const oldCaptureHotkeys = ['CommandOrControl+Shift+C', 'CommandOrControl+G', 'Super+G', 'Command+G', 'Command+Shift+X'];
const oldLibraryHotkeys = ['CommandOrControl+Shift+L', 'CommandOrControl+L', 'Super+L', 'Command+L', 'Command+Shift+V'];
const newCaptureHotkey = 'CommandOrControl+G';
const newLibraryHotkey = 'CommandOrControl+L';

const savedCaptureHotkey = localStorage.getItem('witt:captureHotkey');
if (savedCaptureHotkey) {
  // Migrate old default to new default
  if (oldCaptureHotkeys.includes(savedCaptureHotkey)) {
    localStorage.setItem('witt:captureHotkey', newCaptureHotkey);
    useSettingsStore.getState().captureHotkey = newCaptureHotkey;
  } else {
    useSettingsStore.getState().captureHotkey = savedCaptureHotkey;
  }
}

const savedLibraryHotkey = localStorage.getItem('witt:libraryHotkey');
if (savedLibraryHotkey) {
  // Migrate old default to new default
  if (oldLibraryHotkeys.includes(savedLibraryHotkey)) {
    localStorage.setItem('witt:libraryHotkey', newLibraryHotkey);
    useSettingsStore.getState().libraryHotkey = newLibraryHotkey;
  } else {
    useSettingsStore.getState().libraryHotkey = savedLibraryHotkey;
  }
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
