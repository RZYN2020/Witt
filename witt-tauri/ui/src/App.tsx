import { MockModeBanner } from './components/MockModeBanner';
import { CapturePopup } from './components/capture';
import { Toaster } from './components/Toaster';
import { LibraryView } from './components/library/LibraryView';
import { useSettingsStore } from './stores/useSettingsStore';
import { useEffect } from 'react';

/**
 * Main application component
 */
function App() {
  const { theme } = useSettingsStore();

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

  return (
    <div className="min-h-screen bg-background">
      <MockModeBanner />
      <CapturePopup />
      <Toaster />
      <LibraryView />
    </div>
  );
}

export default App;
