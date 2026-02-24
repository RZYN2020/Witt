import { useEffect, useRef, type MutableRefObject } from 'react';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useHotkeyToastStore } from '@/stores/useHotkeyToastStore';
import type { Source } from '@/types';
import { showCaptureWindow } from '@/lib/captureWindow';

/**
 * Global shortcut manager for Witt
 * Registers system-wide keyboard shortcuts
 */
export function GlobalShortcuts() {
  const { captureHotkey, libraryHotkey, inboxHotkey, hotkeyEnabled } = useSettingsStore();
  const { show } = useHotkeyToastStore();
  const registeredShortcuts = useRef<Set<string>>(new Set());
  const registeredByKind = useRef<Record<'capture' | 'inbox' | 'library', string | null>>({
    capture: null,
    inbox: null,
    library: null,
  });
  const isProcessing = useRef<boolean>(false); // 防止重复处理

  useEffect(() => {
    return () => {
      unregisterAllShortcuts();
      registeredShortcuts.current.clear();
      registeredByKind.current.capture = null;
      registeredByKind.current.inbox = null;
      registeredByKind.current.library = null;
    };
  }, []);

  useEffect(() => {
    // 防止重复处理
    if (isProcessing.current) return;
    isProcessing.current = true;

    const processShortcuts = async () => {
      if (!hotkeyEnabled) {
        unregisterAllShortcuts();
        registeredShortcuts.current.clear();
        registeredByKind.current.capture = null;
        registeredByKind.current.inbox = null;
        registeredByKind.current.library = null;
        isProcessing.current = false;
        return;
      }

      if (captureHotkey) {
        await ensureShortcutRegistered({
          kind: 'capture',
          preferredShortcut: captureHotkey,
          registeredShortcuts,
          registeredByKind,
          onTrigger: async () => {
            console.log('[GlobalShortcut] Capture shortcut triggered');
            show('Capture window opened');
            const clipboardText = await tryGetClipboardText();
            if (clipboardText) {
              try {
                localStorage.setItem(
                  'witt:pendingCapture',
                  JSON.stringify({ text: clipboardText, source: { type: 'app', name: 'Clipboard' } })
                );
              } catch {
                void 0;
              }
            } else {
              await preparePendingCaptureText('witt:pendingCapture');
            }
            await showCaptureWindow({ mode: 'capture' });
          },
          onPersistShortcut: (value) => useSettingsStore.getState().setCaptureHotkey(value),
        });
      } else {
        await unregisterKind('capture', registeredByKind, registeredShortcuts);
      }

      if (inboxHotkey) {
        await ensureShortcutRegistered({
          kind: 'inbox',
          preferredShortcut: inboxHotkey,
          registeredShortcuts,
          registeredByKind,
          onTrigger: async () => {
            console.log('[GlobalShortcut] Inbox shortcut triggered');
            show('Inbox capture triggered');
            const saved = await trySaveSelectionToInbox();
            if (!saved) {
              await showCaptureWindow({ mode: 'inbox' });
            }
          },
          onPersistShortcut: (value) => useSettingsStore.getState().setInboxHotkey(value),
        });
      } else {
        await unregisterKind('inbox', registeredByKind, registeredShortcuts);
      }

      if (libraryHotkey) {
        await ensureShortcutRegistered({
          kind: 'library',
          preferredShortcut: libraryHotkey,
          registeredShortcuts,
          registeredByKind,
          onTrigger: async () => {
            console.log('[GlobalShortcut] Library shortcut triggered');
            show('Library window opened');
            await showMainWindow();
          },
          onPersistShortcut: (value) => useSettingsStore.getState().setLibraryHotkey(value),
        });
      } else {
        await unregisterKind('library', registeredByKind, registeredShortcuts);
      }

      isProcessing.current = false;
    };

    processShortcuts().catch((error) => {
      console.error('[GlobalShortcut] Error processing shortcuts:', error);
      isProcessing.current = false;
    });
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

  // De-dup while keeping order and validate each candidate
  const seen = new Set<string>();
  const uniq: string[] = [];

  for (const c of candidates) {
    // 确保候选快捷键有效且不重复
    if (!seen.has(c) && isValidShortcut(c)) {
      seen.add(c);
      uniq.push(c);
    }
  }

  return uniq;
}

function isValidShortcut(shortcut: string): boolean {
  // 验证快捷键格式是否有效
  if (!shortcut || shortcut.length === 0) return false;

  const parts = shortcut.split('+').map(p => p.trim()).filter(Boolean);

  // 至少需要一个修饰键和一个非修饰键
  const hasModifier = parts.some(p =>
    p === 'CommandOrControl' || p === 'Control' || p === 'Alt' || p === 'Shift'
  );
  const hasNonModifier = parts.some(p =>
    p !== 'CommandOrControl' && p !== 'Control' && p !== 'Alt' && p !== 'Shift'
  );

  return hasModifier && hasNonModifier;
}

type ShortcutKind = 'capture' | 'inbox' | 'library';
type RegisteredByKindRef = MutableRefObject<Record<ShortcutKind, string | null>>;

async function unregisterKind(
  kind: ShortcutKind,
  registeredByKind: RegisteredByKindRef,
  registeredShortcuts: MutableRefObject<Set<string>>
) {
  const shortcut = registeredByKind.current[kind];
  if (!shortcut) return;

  try {
    const { unregister, isRegistered } = await import('@tauri-apps/plugin-global-shortcut');
    if (await isRegistered(shortcut)) {
      await unregister(shortcut);
    }
  } catch (error) {
    console.error('[GlobalShortcut] Failed to unregister shortcut:', shortcut, error);
  }

  registeredShortcuts.current.delete(shortcut);
  registeredByKind.current[kind] = null;
}

async function ensureShortcutRegistered(opts: {
  kind: ShortcutKind;
  preferredShortcut: string;
  registeredShortcuts: MutableRefObject<Set<string>>;
  registeredByKind: RegisteredByKindRef;
  onTrigger: () => Promise<void>;
  onPersistShortcut: (value: string) => void;
}) {
  const candidates = buildFallbackShortcuts(opts.preferredShortcut);
  if (candidates.length === 0) return;

  const current = opts.registeredByKind.current[opts.kind];
  if (current && candidates.includes(current) && opts.registeredShortcuts.current.has(current)) {
    return;
  }
  if (current) {
    await unregisterKind(opts.kind, opts.registeredByKind, opts.registeredShortcuts);
  }

  let lastError: unknown = null;
  for (const shortcut of candidates) {
    const result = await registerShortcut(shortcut, opts.onTrigger);
    if (result.ok) {
      opts.registeredShortcuts.current.add(shortcut);
      opts.registeredByKind.current[opts.kind] = shortcut;

      // If we had to fall back, persist and inform user.
      const normalizedPreferred = normalizeShortcut(opts.preferredShortcut);
      if (shortcut !== normalizedPreferred) {
        // 避免无限循环：不自动更新用户设置，只显示提示
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
async function tryGetClipboardText(): Promise<string | null> {
  try {
    const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
    const text = (await readText()) || '';
    const trimmed = text.trim();
    return trimmed ? trimmed : null;
  } catch {
    return null;
  }
}

async function preparePendingCaptureText(storageKey?: string): Promise<string | null> {
  try {
    const { readText, writeText } = await import('@tauri-apps/plugin-clipboard-manager');
    const previous = (await readText()) || '';

    try {
      const commands = await import('@/lib/commands');
      await commands.simulateCopyShortcut();
    } catch {
      void 0;
    }

    await new Promise((r) => setTimeout(r, 120));

    const current = (await readText()) || '';
    const selected = current.trim();

    if (selected) {
      if (storageKey) {
        try {
          const { useSettingsStore } = await import('@/stores/useSettingsStore');
          const { getCurrentWindowTitle } = await import('@/utils/getCurrentWindowTitle');
          const settings = useSettingsStore.getState();
          const sourceName = settings.useCurrentWindowTitle
            ? await getCurrentWindowTitle()
            : (settings.textSelectionSource || 'Text Selection');
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              text: selected,
              source: { type: 'app', name: sourceName },
            })
          );
        } catch {
          void 0;
        }
      }
    }

    if (previous && previous !== current) {
      try {
        await writeText(previous);
      } catch {
        void 0;
      }
    }

    return selected || null;
  } catch {
    return null;
  }
}

async function trySaveSelectionToInbox(): Promise<boolean> {
  const selected = await preparePendingCaptureText();
  if (!selected) return false;

  const { useSettingsStore } = await import('@/stores/useSettingsStore');
  const { getCurrentWindowTitle } = await import('@/utils/getCurrentWindowTitle');
  const settings = useSettingsStore.getState();
  const sourceName = settings.useCurrentWindowTitle
    ? await getCurrentWindowTitle()
    : (settings.textSelectionSource || 'Text Selection');
  const source: Source = { type: 'app', name: sourceName };

  const { useInboxStore } = await import('@/stores/useInboxStore');
  await useInboxStore.getState().addToInbox(selected, source);

  // 显示系统通知，确保在所有桌面上可见
  const { showInboxSuccessNotification } = await import('@/lib/notifications');
  void showInboxSuccessNotification(selected);

  return true;
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
    const { register, isRegistered } = 
      await import('@tauri-apps/plugin-global-shortcut');

    console.log('[GlobalShortcut] Attempting to register:', shortcut);

    const alreadyRegistered = await isRegistered(shortcut);
    if (alreadyRegistered) {
      console.log('[GlobalShortcut] Already registered, skipping:', shortcut);
      return { ok: true };
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
