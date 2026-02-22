import { useEffect, useRef } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useCaptureStore } from '@/stores/useCaptureStore';

/**
 * Global shortcut manager for Witt
 * Registers system-wide keyboard shortcuts
 */
export function GlobalShortcuts() {
  const { captureHotkey, libraryHotkey, hotkeyEnabled } = useSettingsStore();
  const { openPopup } = useCaptureStore();
  const registeredShortcuts = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hotkeyEnabled) {
      unregisterAllShortcuts();
      registeredShortcuts.current.clear();
      return;
    }

    // Register capture shortcut
    if (captureHotkey) {
      const normalizedCaptureHotkey = captureHotkey.replace('CommandOrControl', 'CmdOrCtrl');
      if (!registeredShortcuts.current.has(normalizedCaptureHotkey)) {
        registerShortcut(normalizedCaptureHotkey, async () => {
          console.log('[GlobalShortcut] Capture shortcut triggered');

          // Show/hide the capture window
          await toggleCaptureWindow();
        });
        registeredShortcuts.current.add(normalizedCaptureHotkey);
      }
    }

    // Register library shortcut
    if (libraryHotkey) {
      const normalizedLibraryHotkey = libraryHotkey.replace('CommandOrControl', 'CmdOrCtrl');
      if (!registeredShortcuts.current.has(normalizedLibraryHotkey)) {
        registerShortcut(normalizedLibraryHotkey, async () => {
          console.log('[GlobalShortcut] Library shortcut triggered');
          await showMainWindow();
        });
        registeredShortcuts.current.add(normalizedLibraryHotkey);
      }
    }

    return () => {
      unregisterAllShortcuts();
      registeredShortcuts.current.clear();
    };
  }, [captureHotkey, libraryHotkey, hotkeyEnabled, openPopup]);

  return null;
}

/**
 * Read text from clipboard
 */
async function readClipboard(): Promise<string> {
  try {
    const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
    return await readText();
  } catch (error) {
    console.error('[Clipboard] Failed to read:', error);
    return '';
  }
}

/**
 * Toggle capture window visibility - show target window and hide others
 */
async function toggleCaptureWindow() {
  try {
    const { getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow');
    const { cursorPosition } = await import('@tauri-apps/api/window');
    const { PhysicalPosition } = await import('@tauri-apps/api/dpi');
    const windows = await getAllWebviewWindows();

    console.log('[Window] Available windows:', windows.map(w => w.label));
    console.log('[Window] Target: capture');

    // Find and show capture window
    let captureWindow = windows.find(w => w.label === 'capture');

    // Get current mouse position for window placement
    const mousePos = await cursorPosition();
    console.log('[Window] Mouse position:', mousePos);

    if (captureWindow) {
      console.log('[Window] Showing existing capture window');
      await captureWindow.show();
      await captureWindow.setFocus();
      await captureWindow.unminimize();
      // Move existing window to mouse position
      await captureWindow.setPosition(new PhysicalPosition(mousePos.x + 16, mousePos.y + 16));
    } else {
      // Create capture window if it doesn't exist
      console.log('[Window] Creating new capture window');
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const newWindow = new WebviewWindow('capture', {
        title: 'Capture Context',
        width: 650,
        height: 750,
        minWidth: 550,
        minHeight: 650,
        resizable: true,
        fullscreen: false,
        decorations: true,
        transparent: false,
        alwaysOnTop: true,
        visible: true,
        x: mousePos.x + 16, // Offset to avoid cursor overlap
        y: mousePos.y + 16,
        skipTaskbar: true,
      });

      // Handle window creation errors
      newWindow.once('tauri://created', () => {
        console.log('[Window] Capture window created successfully');
      });

      newWindow.once('tauri://creation-error', () => {
        console.error('[Window] Failed to create capture window');
      });

      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Hide main window if it's visible
    const mainWindow = windows.find(w => w.label === 'main');
    if (mainWindow) {
      console.log('[Window] Hiding main window');
      await mainWindow.hide();
    }
  } catch (error) {
    console.error('[Window] Failed to toggle capture window:', error);
  }
}

/**
 * Show main window
 */
async function showMainWindow() {
  try {
    const { getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow');
    const windows = await getAllWebviewWindows();

    // Find main window (label is 'main' by default in Tauri)
    let mainWindow = windows.find(w => w.label === 'main');

    if (mainWindow) {
      await mainWindow.show();
      await mainWindow.setFocus();
      await mainWindow.unminimize();
      console.log('[Window] Main window shown');
    }
  } catch (error) {
    console.error('[Window] Failed to show main window:', error);
  }
}

async function registerShortcut(shortcut: string, callback: () => void) {
  try {
    const { register, isRegistered, unregister } = await import('@tauri-apps/plugin-global-shortcut');

    console.log('[GlobalShortcut] Attempting to register:', shortcut);

    const alreadyRegistered = await isRegistered(shortcut);
    if (alreadyRegistered) {
      console.log('[GlobalShortcut] Already registered, unregistering first:', shortcut);
      await unregister(shortcut);
    }

    await register(shortcut, (event) => {
      if (event.state === 'Pressed') {
        console.log('[GlobalShortcut] Shortcut pressed:', shortcut);
        callback();
      }
    });

    // Verify registration
    const isNowRegistered = await isRegistered(shortcut);
    if (isNowRegistered) {
      console.log('[GlobalShortcut] ✓ Successfully registered:', shortcut);
    } else {
      console.error('[GlobalShortcut] ✗ Failed to register:', shortcut, '- Registration check failed');
    }
  } catch (error) {
    console.error('[GlobalShortcut] ✗ Failed to register shortcut:', shortcut, error);
  }
}

async function unregisterAllShortcuts() {
  try {
    const { unregisterAll } = await import('@tauri-apps/plugin-global-shortcut');
    await unregisterAll();
    console.log('[GlobalShortcut] Unregistered all shortcuts');
  } catch (error) {
    console.error('[GlobalShortcut] Failed to unregister all:', error);
  }
}
