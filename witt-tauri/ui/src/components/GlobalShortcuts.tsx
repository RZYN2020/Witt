import { useEffect, useRef, type MutableRefObject } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';

/**
 * Global shortcut manager for Witt
 * Registers system-wide keyboard shortcuts
 */
export function GlobalShortcuts() {
  const { captureHotkey, libraryHotkey, inboxHotkey, hotkeyEnabled } = useSettingsStore();
  const registeredShortcuts = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hotkeyEnabled) {
      unregisterAllShortcuts();
      registeredShortcuts.current.clear();
      return;
    }

    // Register capture shortcut
    if (captureHotkey) {
      void ensureShortcutRegistered({
        kind: 'capture',
        preferredShortcut: captureHotkey,
        registeredShortcuts,
        onTrigger: async () => {
          console.log('[GlobalShortcut] Capture shortcut triggered');
          await toggleCaptureWindow({ mode: 'capture' });
        },
        onPersistShortcut: (value) => useSettingsStore.getState().setCaptureHotkey(value),
      });
    }

    if (inboxHotkey) {
      void ensureShortcutRegistered({
        kind: 'inbox',
        preferredShortcut: inboxHotkey,
        registeredShortcuts,
        onTrigger: async () => {
          console.log('[GlobalShortcut] Inbox shortcut triggered');
          await toggleCaptureWindow({ mode: 'inbox' });
        },
        onPersistShortcut: (value) => useSettingsStore.getState().setInboxHotkey(value),
      });
    }

    // Register library shortcut
    if (libraryHotkey) {
      void ensureShortcutRegistered({
        kind: 'library',
        preferredShortcut: libraryHotkey,
        registeredShortcuts,
        onTrigger: async () => {
          console.log('[GlobalShortcut] Library shortcut triggered');
          await showMainWindow();
        },
        onPersistShortcut: (value) => useSettingsStore.getState().setLibraryHotkey(value),
      });
    }

    return () => {
      unregisterAllShortcuts();
      registeredShortcuts.current.clear();
    };
  }, [captureHotkey, inboxHotkey, libraryHotkey, hotkeyEnabled]);

  return null;
}

/**
 * Normalize shortcut string to the format expected by `@tauri-apps/plugin-global-shortcut`.
 * The plugin docs/examples use `CommandOrControl`.
 */
function normalizeShortcut(shortcut: string): string {
  // Keep compatibility with older TS target (no `String.prototype.replaceAll`).
  return shortcut
    .replace(/CmdOrCtrl/g, 'CommandOrControl')
    .replace(/CmdOrControl/g, 'CommandOrControl');
}

function getShortcutKey(shortcut: string): string {
  const parts = shortcut.split('+').map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] || '';
}

function buildFallbackShortcuts(preferredShortcut: string): string[] {
  const normalized = normalizeShortcut(preferredShortcut);
  const key = getShortcutKey(normalized);
  if (!key) return [];

  // Command+G / Command+L are frequently used by system/apps, so try less conflicting combos.
  // Keep `CommandOrControl` for cross-platform and allow user override later.
  const candidates = [
    normalized,
    `CommandOrControl+Shift+${key}`,
    `CommandOrControl+Alt+${key}`,
    `CommandOrControl+Shift+Alt+${key}`,
    `Control+Alt+${key}`,
  ];

  // De-dup while keeping order
  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const c of candidates) {
    if (!seen.has(c)) {
      seen.add(c);
      uniq.push(c);
    }
  }
  return uniq;
}

async function ensureShortcutRegistered(opts: {
  kind: 'capture' | 'inbox' | 'library';
  preferredShortcut: string;
  registeredShortcuts: MutableRefObject<Set<string>>;
  onTrigger: () => Promise<void>;
  onPersistShortcut: (value: string) => void;
}) {
  const candidates = buildFallbackShortcuts(opts.preferredShortcut);
  if (candidates.length === 0) return;

  // Already registered with any candidate shortcut.
  if (candidates.some((c) => opts.registeredShortcuts.current.has(c))) return;

  let lastError: unknown = null;
  for (const shortcut of candidates) {
    const result = await registerShortcut(shortcut, opts.onTrigger);
    if (result.ok) {
      opts.registeredShortcuts.current.add(shortcut);

      // If we had to fall back, persist and inform user.
      const normalizedPreferred = normalizeShortcut(opts.preferredShortcut);
      if (shortcut !== normalizedPreferred) {
        opts.onPersistShortcut(shortcut);
        await toastHotkeyInfo(
          `${opts.kind === 'capture' ? '捕获' : opts.kind === 'inbox' ? 'Inbox' : '打开库'}快捷键“${normalizedPreferred}”可能与系统/其它应用冲突，已自动切换为“${shortcut}”。可在 Settings 里修改。`
        );
      }
      return;
    }

    if (result.error) lastError = result.error;
  }

  await toastHotkeyError(
    `全局快捷键注册失败：${normalizeShortcut(opts.preferredShortcut)}。可能被系统/其它应用占用或被系统策略拦截。请在 Settings 里改成更复杂的组合键（例如 CommandOrControl+Shift+${getShortcutKey(opts.preferredShortcut)}）。`
  );
  // Keep lastError for console debugging
  if (lastError) {
    console.error('[GlobalShortcut] registration failed:', lastError);
  }
}

/**
 * Toggle capture window visibility - show target window and hide others
 */
async function toggleCaptureWindow(opts?: { mode?: 'capture' | 'inbox' }) {
  try {
    const { getAllWebviewWindows } = await import('@tauri-apps/api/webviewWindow');
    const { PhysicalPosition } = await import('@tauri-apps/api/dpi');
    const windows = await getAllWebviewWindows();

    const mode = opts?.mode === 'inbox' ? 'inbox' : 'capture';
    try {
      localStorage.setItem('witt:captureMode', mode);
    } catch {
      // ignore
    }

    // Best-effort: capture selected text from the currently focused app.
    // Store it for the capture window to consume.
    await preparePendingCaptureText(mode === 'inbox' ? 'witt:pendingInboxCapture' : 'witt:pendingCapture');

    console.log(
      '[Window] Available windows:',
      windows.map((w) => w.label)
    );
    console.log('[Window] Target: capture');

    // Find and show capture window
    const captureWindow = windows.find((w) => w.label === 'capture');

    // Get system/global mouse position for window placement.
    // `window.cursorPosition()` is relative to the current window and becomes incorrect
    // when the app is not focused.
    const mousePos = await getGlobalMousePosition();
    console.log('[Window] Global mouse position:', mousePos);

    if (captureWindow) {
      console.log('[Window] Showing existing capture window');
      // Make it visible across Spaces (macOS) so it can show over the currently active app.
      try {
        await (captureWindow as any).setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      } catch {
        // ignore
      }
      try {
        await captureWindow.setAlwaysOnTop(true);
      } catch {
        // ignore
      }
      try {
        await captureWindow.setSkipTaskbar(true);
      } catch {
        // ignore
      }

      // Position first, then show/focus.
      await captureWindow.setPosition(new PhysicalPosition(mousePos.x + 16, mousePos.y + 16));
      await captureWindow.show();
      await captureWindow.unminimize();
      await captureWindow.setFocus();
    } else {
      // Create capture window if it doesn't exist
      console.log('[Window] Creating new capture window');
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      const newWindow = new WebviewWindow('capture', {
        title: mode === 'inbox' ? 'Inbox Quick Capture' : 'Capture Context',
        width: 650,
        height: 750,
        minWidth: 550,
        minHeight: 650,
        resizable: true,
        fullscreen: false,
        decorations: true,
        transparent: false,
        alwaysOnTop: true,
        visibleOnAllWorkspaces: true,
        visible: true,
        x: mousePos.x + 16, // Offset to avoid cursor overlap
        y: mousePos.y + 16,
        skipTaskbar: true,
      });

      // Handle window creation errors
      newWindow.once('tauri://created', () => {
        console.log('[Window] Capture window created successfully');
        void (async () => {
          try {
            await (newWindow as any).setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
          } catch {
            // ignore
          }
          try {
            await newWindow.setAlwaysOnTop(true);
          } catch {
            // ignore
          }
          try {
            await newWindow.setSkipTaskbar(true);
          } catch {
            // ignore
          }
        })();
      });

      newWindow.once('tauri://creation-error', () => {
        console.error('[Window] Failed to create capture window');
      });

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    // Keep main window state unchanged here. Hiding/showing the main window can cause
    // Space switches on macOS and makes the capture popup feel like it is "tied" to the app.
  } catch (error) {
    console.error('[Window] Failed to toggle capture window:', error);
  }
}

async function getGlobalMousePosition(): Promise<{ x: number; y: number }> {
  // Prefer backend global cursor position (works even when app is not focused)
  try {
    const commands = await import('@/lib/commands');
    return await commands.getGlobalCursorPosition();
  } catch {
    // Fallback: best-effort using current window coordinates
  }

  try {
    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow');
    const { cursorPosition } = await import('@tauri-apps/api/window');

    const win = getCurrentWebviewWindow();
    const winPos = await win.outerPosition();
    const rel = await cursorPosition();

    return { x: winPos.x + rel.x, y: winPos.y + rel.y };
  } catch {
    return { x: 0, y: 0 };
  }
}

async function preparePendingCaptureText(storageKey: string) {
  try {
    const { readText, writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    const previous = (await readText()) || '';

    // Try to simulate Cmd+C / Ctrl+C via backend (macOS requires Accessibility permission)
    try {
      const commands = await import('@/lib/commands');
      await commands.simulateCopyShortcut();
    } catch {
      // ignore
    }

    // Give the OS a moment to update clipboard
    await new Promise((r) => setTimeout(r, 120));

    const current = (await readText()) || '';
    const selected = current.trim();

    if (selected) {
      // Provide pending capture to the capture window
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            text: selected,
            source: { type: 'app', name: 'Text Selection' },
          })
        );
      } catch {
        // ignore
      }
    }

    // Restore clipboard to avoid polluting user's clipboard
    if (previous && previous !== current) {
      try {
        await writeText(previous);
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore all errors
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
    const mainWindow = windows.find((w) => w.label === 'main');

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

async function registerShortcut(
  shortcut: string,
  callback: () => void
): Promise<{ ok: boolean; error?: unknown }> {
  try {
    const { register, isRegistered, unregister } =
      await import('@tauri-apps/plugin-global-shortcut');

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
      return { ok: true };
    } else {
      console.error(
        '[GlobalShortcut] ✗ Failed to register:',
        shortcut,
        '- Registration check failed'
      );
      return { ok: false };
    }
  } catch (error) {
    console.error('[GlobalShortcut] ✗ Failed to register shortcut:', shortcut, error);
    return { ok: false, error };
  }
}

async function toastHotkeyError(message: string) {
  // Only show toasts in Tauri runtime.
  if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return;
  try {
    const { useToastStore } = await import('@/stores/useToastStore');
    useToastStore.getState().addToast({ type: 'error', message, duration: 6000 });
  } catch {
    // ignore
  }
}

async function toastHotkeyInfo(message: string) {
  if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) return;
  try {
    const { useToastStore } = await import('@/stores/useToastStore');
    useToastStore.getState().addToast({ type: 'info', message, duration: 6000 });
  } catch {
    // ignore
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
