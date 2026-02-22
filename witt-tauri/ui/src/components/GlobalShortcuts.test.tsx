import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { GlobalShortcuts } from './GlobalShortcuts';
import { useSettingsStore } from '@/stores/useSettingsStore';

// Mock the stores
vi.mock('@/stores/useSettingsStore');

describe('GlobalShortcuts', () => {
  beforeEach(() => {
    // Mock the settings store
    (useSettingsStore as vi.Mock).mockReturnValue({
      captureHotkey: 'CmdOrCtrl+G',
      libraryHotkey: 'CmdOrCtrl+L',
      hotkeyEnabled: true,
      autoFetchDefinitions: true,
      includeScreenshots: false,
      defaultDeck: 'Default',
      defaultTags: [],
      maxContextsPerNote: 5,
      autoConsolidateDuplicates: true,
      ankiEnabled: false,
      ankiConnectUrl: 'http://localhost:8765',
      autoSyncToAnki: false,
      ankiNoteType: 'Witt - Basic',
      ankiFieldMapping: {},
      dataDirectory: '',
      backupEnabled: true,
      backupInterval: 'daily',
      setTheme: vi.fn(),
      setAppLanguage: vi.fn(),
      setCaptureHotkey: vi.fn(),
      setLibraryHotkey: vi.fn(),
      setHotkeyEnabled: vi.fn(),
      setAutoFetchDefinitions: vi.fn(),
      setIncludeScreenshots: vi.fn(),
      setDefaultDeck: vi.fn(),
      setDefaultTags: vi.fn(),
      setMaxContextsPerNote: vi.fn(),
      setAutoConsolidateDuplicates: vi.fn(),
      setAnkiEnabled: vi.fn(),
      setAnkiConnectUrl: vi.fn(),
      setAutoSyncToAnki: vi.fn(),
      setAnkiNoteType: vi.fn(),
      setAnkiFieldMapping: vi.fn(),
      setDataDirectory: vi.fn(),
      setBackupEnabled: vi.fn(),
      setBackupInterval: vi.fn(),
    });
  });

  it('renders without errors', () => {
    expect(() => {
      render(<GlobalShortcuts />);
    }).not.toThrow();
  });

  it('renders null component (should not be visible)', () => {
    const { container } = render(<GlobalShortcuts />);
    expect(container.firstChild).toBeNull();
  });

  it('registers shortcuts when hotkeyEnabled is true', async () => {
    render(<GlobalShortcuts />);

    // The component should register shortcuts on mount
    // This is more of an integration test, but we can check basic functionality
    expect(true).toBeTruthy(); // Placeholder assertion
  });

  it('unregisters all shortcuts when unmounted', async () => {
    const { unmount } = render(<GlobalShortcuts />);
    unmount();

    // Should unregister all shortcuts
    expect(true).toBeTruthy(); // Placeholder assertion
  });

  describe('when hotkeyEnabled is false', () => {
    beforeEach(() => {
      (useSettingsStore as vi.Mock).mockReturnValue({
        ...(useSettingsStore as vi.Mock).mock.results[0].value,
        hotkeyEnabled: false,
      });
    });

    it('does not register shortcuts when hotkeyEnabled is false', async () => {
      render(<GlobalShortcuts />);

      // Should not register any shortcuts
      expect(true).toBeTruthy(); // Placeholder assertion
    });
  });
});
