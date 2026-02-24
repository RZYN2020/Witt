export async function showCaptureWindow(opts?: { mode?: 'capture' | 'inbox' }) {
  try {
    const { getAllWebviewWindows, WebviewWindow, getCurrentWebviewWindow } = await import(
      '@tauri-apps/api/webviewWindow'
    );
    const { PhysicalPosition } = await import('@tauri-apps/api/dpi');
    const { invoke } = await import('@tauri-apps/api/core');

    const mode = opts?.mode === 'inbox' ? 'inbox' : 'capture';
    try {
      localStorage.setItem('witt:captureMode', mode);
    } catch {
      void 0;
    }

    const windows = await getAllWebviewWindows();
    const captureWindow = windows.find((w) => w.label === 'capture');
    const mousePos = await getGlobalMousePosition();

    const ensureWindowFlags = async (win: any) => {
      try {
        await win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      } catch {
        void 0;
      }
      try {
        await win.setAlwaysOnTop(true);
      } catch {
        void 0;
      }
      try {
        await win.setSkipTaskbar(true);
      } catch {
        void 0;
      }
      // Call Rust command to set proper macOS window level
      try {
        await invoke('set_popup_window_level', { label: 'capture' });
      } catch {
        void 0;
      }
    };

    if (captureWindow) {
      await ensureWindowFlags(captureWindow as any);
      await captureWindow.setPosition(new PhysicalPosition(mousePos.x + 16, mousePos.y + 16));
      await captureWindow.show();
      await captureWindow.unminimize();
      await captureWindow.setFocus();
      return;
    }

    const current = getCurrentWebviewWindow();
    const scale = (await current.scaleFactor().catch(() => 1)) || 1;
    const width = Math.round(650 * scale);
    const height = Math.round(750 * scale);

    const newWindow = new WebviewWindow('capture', {
      title: mode === 'inbox' ? 'Inbox Quick Capture' : 'Capture Context',
      width,
      height,
      minWidth: Math.round(550 * scale),
      minHeight: Math.round(650 * scale),
      resizable: true,
      fullscreen: false,
      decorations: true,
      transparent: false,
      alwaysOnTop: true,
      visibleOnAllWorkspaces: true,
      visible: true,
      x: mousePos.x + 16,
      y: mousePos.y + 16,
      skipTaskbar: true,
    });

    newWindow.once('tauri://created', () => {
      void ensureWindowFlags(newWindow as any);
    });

    await new Promise((resolve) => setTimeout(resolve, 250));
  } catch {
    void 0;
  }
}

async function getGlobalMousePosition(): Promise<{ x: number; y: number }> {
  try {
    const commands = await import('@/lib/commands');
    return await commands.getGlobalCursorPosition();
  } catch {
    void 0;
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

