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
  inboxHotkey: string;
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

  // Text Selection settings
  textSelectionSource: string;
  useCurrentWindowTitle: boolean;

  // Data management
  dataDirectory: string;
  backupEnabled: boolean;
  backupInterval: 'daily' | 'weekly' | 'monthly';

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setAppLanguage: (language: 'en' | 'zh' | 'ja' | 'ko' | 'de') => void;
  setCaptureHotkey: (hotkey: string) => void;
  setLibraryHotkey: (hotkey: string) => void;
  setInboxHotkey: (hotkey: string) => void;
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
  // Default: Cmd+; / Cmd+' / Cmd+, (CmdOrCtrl on non-macOS)
  captureHotkey: 'CommandOrControl+;',
  libraryHotkey: "CommandOrControl+'",
  inboxHotkey: 'CommandOrControl+,',
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

  // Text Selection settings
  textSelectionSource: 'Text Selection',
  useCurrentWindowTitle: false,

  setTheme: (theme) => {
    set({ theme });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:theme', theme);
      }
    } catch {
      // ignore
    }
    applyTheme(theme);
  },

  setAppLanguage: (language) => {
    set({ appLanguage: language });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:appLanguage', language);
      }
    } catch {
      // ignore
    }
  },

  setCaptureHotkey: (hotkey) => {
    set({ captureHotkey: hotkey });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:captureHotkey', hotkey);
      }
    } catch {
      // ignore
    }
  },

  setLibraryHotkey: (hotkey) => {
    set({ libraryHotkey: hotkey });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:libraryHotkey', hotkey);
      }
    } catch {
      // ignore
    }
  },

  setInboxHotkey: (hotkey) => {
    set({ inboxHotkey: hotkey });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:inboxHotkey', hotkey);
      }
    } catch {
      // ignore
    }
  },

  setHotkeyEnabled: (enabled) => {
    set({ hotkeyEnabled: enabled });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:hotkeyEnabled', String(enabled));
      }
    } catch {
      // ignore
    }
  },

  setAutoFetchDefinitions: (enabled) => {
    set({ autoFetchDefinitions: enabled });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:autoFetchDefinitions', String(enabled));
      }
    } catch {
      // ignore
    }
  },

  setIncludeScreenshots: (enabled) => {
    set({ includeScreenshots: enabled });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:includeScreenshots', String(enabled));
      }
    } catch {
      // ignore
    }
  },

  setDefaultDeck: (deck) => {
    set({ defaultDeck: deck });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:defaultDeck', deck);
      }
    } catch {
      // ignore
    }
  },

  setDefaultTags: (tags) => {
    set({ defaultTags: tags });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:defaultTags', JSON.stringify(tags));
      }
    } catch {
      // ignore
    }
  },

  setMaxContextsPerNote: (max) => {
    // Enforce maximum of 5 per design spec
    const clampedMax = Math.min(Math.max(1, max), 5);
    set({ maxContextsPerNote: clampedMax });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:maxContextsPerNote', String(clampedMax));
      }
    } catch {
      // ignore
    }
  },

  setAutoConsolidateDuplicates: (enabled) => {
    set({ autoConsolidateDuplicates: enabled });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:autoConsolidateDuplicates', String(enabled));
      }
    } catch {
      // ignore
    }
  },

  setAnkiEnabled: (enabled) => {
    set({ ankiEnabled: enabled });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:ankiEnabled', String(enabled));
      }
    } catch {
      // ignore
    }
  },

  setAnkiConnectUrl: (url) => {
    set({ ankiConnectUrl: url });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:ankiConnectUrl', url);
      }
    } catch {
      // ignore
    }
  },

  setAutoSyncToAnki: (enabled) => {
    set({ autoSyncToAnki: enabled });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:autoSyncToAnki', String(enabled));
      }
    } catch {
      // ignore
    }
  },

  setAnkiNoteType: (type) => {
    set({ ankiNoteType: type });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:ankiNoteType', type);
      }
    } catch {
      // ignore
    }
  },

  setAnkiFieldMapping: (mapping) => {
    set({ ankiFieldMapping: mapping });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:ankiFieldMapping', JSON.stringify(mapping));
      }
    } catch {
      // ignore
    }
  },

  setDataDirectory: (dir) => {
    set({ dataDirectory: dir });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:dataDirectory', dir);
      }
    } catch {
      // ignore
    }
  },

  setBackupEnabled: (enabled) => {
    set({ backupEnabled: enabled });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:backupEnabled', String(enabled));
      }
    } catch {
      // ignore
    }
  },

  setBackupInterval: (interval) => {
    set({ backupInterval: interval });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:backupInterval', interval);
      }
    } catch {
      // ignore
    }
  },

  setTextSelectionSource: (source: string) => {
    set({ textSelectionSource: source });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:textSelectionSource', source);
      }
    } catch {
      // ignore
    }
  },

  setUseCurrentWindowTitle: (use: boolean) => {
    set({ useCurrentWindowTitle: use });
    try {
      if (typeof localStorage?.setItem === 'function') {
        localStorage.setItem('witt:useCurrentWindowTitle', String(use));
      }
    } catch {
      // ignore
    }
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
try {
  if (typeof localStorage?.getItem === 'function' && typeof localStorage?.setItem === 'function') {
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

    const savedInboxHotkey = localStorage.getItem('witt:inboxHotkey');
    if (savedInboxHotkey) {
      useSettingsStore.getState().inboxHotkey = savedInboxHotkey;
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

    const savedLanguage = localStorage.getItem('witt:appLanguage') as
      | 'en'
      | 'zh'
      | 'ja'
      | 'ko'
      | 'de'
      | null;
    if (savedLanguage) {
      useSettingsStore.getState().appLanguage = savedLanguage;
    }

    const savedTextSelectionSource = localStorage.getItem('witt:textSelectionSource');
    if (savedTextSelectionSource) {
      useSettingsStore.getState().textSelectionSource = savedTextSelectionSource;
    }

    const savedUseCurrentWindowTitle = localStorage.getItem('witt:useCurrentWindowTitle');
    if (savedUseCurrentWindowTitle !== null) {
      useSettingsStore.getState().useCurrentWindowTitle = savedUseCurrentWindowTitle === 'true';
    }
  }
} catch (error) {
  console.warn('Failed to load settings from localStorage:', error);
}

// Listen for system theme changes
if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useSettingsStore.getState().theme === 'system') {
      applyTheme('system');
    }
  });
}
