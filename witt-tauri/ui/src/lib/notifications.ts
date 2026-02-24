import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

/**
 * Dispatch capture success event for UI toast
 */
function dispatchCaptureSuccessEvent(word: string | undefined, context: string) {
  window.dispatchEvent(
    new CustomEvent('witt:capture-success', {
      detail: { word, context },
    })
  );
}

/**
 * Dispatch inbox success event for UI toast
 */
function dispatchInboxSuccessEvent(context: string) {
  window.dispatchEvent(
    new CustomEvent('witt:inbox-success', {
      detail: { context },
    })
  );
}

/**
 * Show a system notification for capture success
 * This works across all desktops/spaces
 */
export async function showCaptureSuccessNotification(context: string, word?: string): Promise<void> {
  // Always dispatch UI toast event (visible in capture window)
  dispatchCaptureSuccessEvent(word, context);

  try {
    // Check if permission is granted
    let permissionGranted = await isPermissionGranted();

    // If not granted, request permission
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }

    if (!permissionGranted) {
      console.warn('[Notification] Permission not granted for notifications');
      return;
    }

    // Truncate context for notification body
    const maxLength = 100;
    const truncatedContext = context.length > maxLength
      ? `${context.substring(0, maxLength)}...`
      : context;

    const title = word ? `Captured: ${word}` : 'Context Captured';

    sendNotification({
      title,
      body: truncatedContext,
      icon: 'icons/icon.png',
    });

    console.log('[Notification] Capture success notification sent');
  } catch (error) {
    console.error('[Notification] Failed to show notification:', error);
  }
}

/**
 * Show a system notification for inbox item added
 */
export async function showInboxSuccessNotification(context: string): Promise<void> {
  // Always dispatch UI toast event (visible in capture window)
  dispatchInboxSuccessEvent(context);

  try {
    let permissionGranted = await isPermissionGranted();

    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === 'granted';
    }

    if (!permissionGranted) {
      console.warn('[Notification] Permission not granted for notifications');
      return;
    }

    const maxLength = 100;
    const truncatedContext = context.length > maxLength
      ? `${context.substring(0, maxLength)}...`
      : context;

    sendNotification({
      title: 'Saved to Inbox',
      body: truncatedContext,
      icon: 'icons/icon.png',
    });

    console.log('[Notification] Inbox success notification sent');
  } catch (error) {
    console.error('[Notification] Failed to show notification:', error);
  }
}

/**
 * Request notification permission on app startup
 */
export async function initNotifications(): Promise<void> {
  try {
    const permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      await requestPermission();
    }
  } catch (error) {
    console.error('[Notification] Failed to initialize notifications:', error);
  }
}
