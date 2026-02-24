import { CapturePopup } from './components/capture';
import { InboxCapturePopup } from './components/inbox';
import { Toaster } from './components/Toaster';
import { GlobalHotkeyToast } from './components/GlobalHotkeyToast';
import { GlobalCaptureToast } from './components/GlobalCaptureToast';
import { LibraryView } from './components/library/LibraryView';
import { GlobalShortcuts } from './components/GlobalShortcuts';
import { ContextMenuHandler } from './components/ContextMenuHandler';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { getCurrentWindowTitle } from '@/utils/getCurrentWindowTitle';
import { useCaptureStore } from '@/stores/useCaptureStore';
import { useHotkeyToastStore } from '@/stores/useHotkeyToastStore';
import { useEffect, useState } from 'react';
import * as commands from './lib/commands';
import { initNotifications } from '@/lib/notifications';

/**
 * Main application component
 */
function App() {
  const { theme } = useSettingsStore();
  const { openPopup } = useCaptureStore();
  const { isVisible, message, hide } = useHotkeyToastStore();
  const [initialized, setInitialized] = useState(false);
  const [isCaptureWindow, setIsCaptureWindow] = useState(false);
  const [captureMode, setCaptureMode] = useState<'capture' | 'inbox'>('capture');

  // Determine if we're in the capture window
  useEffect(() => {
    const checkWindowLabel = async () => {
      try {
        const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
        const currentWindow = getCurrentWebviewWindow();
        console.log('[App] Current window label:', currentWindow.label);
        setIsCaptureWindow(currentWindow.label === 'capture');
        if (currentWindow.label === 'capture') {
          try {
            const mode = localStorage.getItem('witt:captureMode');
            setCaptureMode(mode === 'inbox' ? 'inbox' : 'capture');
          } catch {
            setCaptureMode('capture');
          }
        }
      } catch (error) {
        console.error('[App] Failed to get window label:', error);
        setIsCaptureWindow(false);
      }
    };

    checkWindowLabel();
  }, []);

  // Initialize WittCore and notifications on mount
  useEffect(() => {
    const init = async () => {
      try {
        await commands.initCore();
        console.log('[App] WittCore initialized successfully');
        // Initialize notifications (request permission)
        await initNotifications();
        setInitialized(true);
      } catch (error) {
        console.error('[App] Failed to initialize WittCore:', error);
        // In browser mode (non-Tauri), initialization will fail
        // This is expected - the app needs to run in Tauri
        if (error instanceof Error && error.message.includes('IPC')) {
          console.warn('[App] Running in browser mode. Some features may not be available.');
        }
        // Still set initialized to true to allow UI to show
        setInitialized(true);
      }
    };

    init();
  }, []);

  // Apply theme on mount
  useEffect(() => {
    const root = document.documentElement;

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Auto-open capture popup if we're in capture window
  useEffect(() => {
    if (isCaptureWindow && captureMode === 'capture') {
      const consumePending = async () => {
        try {
          // Prefer pending capture text prepared by the main window (selection capture).
          try {
            const pending = localStorage.getItem('witt:pendingCapture');
            if (pending) {
              localStorage.removeItem('witt:pendingCapture');
              const parsed = JSON.parse(pending) as { text?: string; source?: any };
              const text = (parsed.text || '').trim();
              if (text) {
                const source = parsed.source || { type: 'app', name: 'Text Selection' };
            // 如果是默认的 Text Selection，根据设置决定使用什么名称
            if (source.name === 'Text Selection') {
              const { textSelectionSource, useCurrentWindowTitle } = useSettingsStore.getState();
              if (useCurrentWindowTitle) {
                try {
                  const currentTitle = await getCurrentWindowTitle();
                  source.name = currentTitle;
                } catch {
                  source.name = textSelectionSource;
                }
              } else {
                source.name = textSelectionSource;
              }
            }
            openPopup(text, source);
                return;
              }
            }
          } catch {
            // ignore
          }

          // Fallback: clipboard
          const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
          const clipboardText = await readText();
          if (clipboardText) {
            openPopup(clipboardText.trim(), { type: 'app', name: 'Clipboard' });
          } else {
            openPopup('', { type: 'app', name: 'Global Shortcut' });
          }
        } catch (error) {
          console.error('[App] Failed to read clipboard:', error);
          openPopup('', { type: 'app', name: 'Global Shortcut' });
        }
      };

      void consumePending();
    }
  }, [isCaptureWindow, captureMode, openPopup]);

  useEffect(() => {
    if (!isCaptureWindow) return;

    const onStorage = async (e: StorageEvent) => {
      if (e.key === 'witt:captureMode') {
        setCaptureMode(e.newValue === 'inbox' ? 'inbox' : 'capture');
        return;
      }

      if (e.key === 'witt:pendingCapture') {
        if (captureMode !== 'capture') return;
        try {
          const pending = localStorage.getItem('witt:pendingCapture');
          if (!pending) return;
          localStorage.removeItem('witt:pendingCapture');
          const parsed = JSON.parse(pending) as { text?: string; source?: any };
          const text = (parsed.text || '').trim();
          if (text) {
            const source = parsed.source || { type: 'app', name: 'Text Selection' };
            // 如果是默认的 Text Selection，根据设置决定使用什么名称
            if (source.name === 'Text Selection') {
              const { textSelectionSource, useCurrentWindowTitle } = useSettingsStore.getState();
              if (useCurrentWindowTitle) {
                try {
                  const currentTitle = await getCurrentWindowTitle();
                  source.name = currentTitle;
                } catch {
                  source.name = textSelectionSource;
                }
              } else {
                source.name = textSelectionSource;
              }
            }
            openPopup(text, source);
          }
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isCaptureWindow, captureMode, openPopup]);

  // Show loading state while initializing
  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing WittCore...</p>
        </div>
      </div>
    );
  }

  // If it's the capture window, only render the capture popup
  if (isCaptureWindow) {
    return (
      <div className="min-h-screen bg-background">
        {captureMode === 'inbox' ? <InboxCapturePopup /> : <CapturePopup />}
        <Toaster />
        <GlobalHotkeyToast
          open={isVisible}
          message={message}
          onClose={hide}
        />
        <GlobalCaptureToast />
      </div>
    );
  }

  // If it's the main window, render the full application
  return (
    <div className="min-h-screen bg-background">
      {/* Global Shortcuts */}
      <GlobalShortcuts />

      {/* Context Menu Handler */}
      <ContextMenuHandler />

      {/* Toast Notifications */}
      <Toaster />

      {/* Global Hotkey Toast */}
      <GlobalHotkeyToast
        open={isVisible}
        message={message}
        onClose={hide}
      />

      {/* Main Library View */}
      <LibraryView />
    </div>
  );
}

export default App;
