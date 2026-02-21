import { CapturePopup } from './components/capture';
import { Toaster } from './components/Toaster';
import { LibraryView } from './components/library/LibraryView';
import { GlobalShortcuts } from './components/GlobalShortcuts';
import { ContextMenuHandler } from './components/ContextMenuHandler';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useEffect, useState } from 'react';
import * as commands from './lib/commands';

/**
 * Main application component
 */
function App() {
  const { theme } = useSettingsStore();
  const [initialized, setInitialized] = useState(false);

  // Initialize WittCore on mount
  useEffect(() => {
    const init = async () => {
      try {
        await commands.initCore();
        console.log('[App] WittCore initialized successfully');
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

  return (
    <div className="min-h-screen bg-background">
      {/* Global Shortcuts */}
      <GlobalShortcuts />
      
      {/* Context Menu Handler */}
      <ContextMenuHandler />
      
      {/* Capture Popup */}
      <CapturePopup />
      
      {/* Toast Notifications */}
      <Toaster />
      
      {/* Main Library View */}
      <LibraryView />
    </div>
  );
}

export default App;
