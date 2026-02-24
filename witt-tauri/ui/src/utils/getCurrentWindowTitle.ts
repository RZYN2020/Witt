import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * 获取当前窗口标题的函数
 * @returns 当前窗口标题或默认值
 */
export async function getCurrentWindowTitle(): Promise<string> {
  try {
    const window = getCurrentWindow();
    return await window.title();
  } catch (error) {
    console.error('[utils/getCurrentWindowTitle] Failed to get window title:', error);
    return 'Text Selection';
  }
}
