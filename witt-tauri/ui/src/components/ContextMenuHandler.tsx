import { useEffect } from 'react';
import { useCaptureStore } from '@/stores/useCaptureStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { getCurrentWindowTitle } from '@/utils/getCurrentWindowTitle';

/**
 * Context menu handler for text selection
 * Shows capture option when user right-clicks on selected text
 */
export function ContextMenuHandler() {
  const { openPopup } = useCaptureStore();

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      // Check if there's selected text
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim();

      if (selectedText) {
        // Create custom context menu item
        showCaptureOption(event, selectedText, openPopup);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [openPopup]);

  return null;
}

/**
 * Show capture option in context menu
 */
async function showCaptureOption(
  event: MouseEvent,
  selectedText: string,
  openPopup: (context: string, source: any) => void
) {
  // Prevent default context menu temporarily
  event.preventDefault();

  // Show native context menu after a short delay
  setTimeout(async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Capture this text to Witt?\n\n"${selectedText.substring(0, 100)}${selectedText.length > 100 ? '...' : ''}"`
    );

    if (confirmed) {
      const { textSelectionSource, useCurrentWindowTitle } = useSettingsStore.getState();
      const sourceName = useCurrentWindowTitle
        ? await getCurrentWindowTitle()
        : (textSelectionSource || 'Text Selection');
      openPopup(selectedText, { type: 'app', name: sourceName });
    }
  }, 10);
}
