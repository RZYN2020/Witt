import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { LibraryHeader } from './LibraryHeader';
import { FilterBadges } from './FilterBadges';
import { CardGrid } from './CardGrid';
import { CardList } from './CardList';
import { CardDetail } from './CardDetail';
import { EmptyState } from './EmptyState';
import { SelectionToolbar } from './SelectionToolbar';
import { VideoLibrary } from '@/components/video/VideoLibrary';
import { DeckView } from '@/components/deck/DeckView';
import { useLibraryStore } from '@/stores/useLibraryStore';

type CurrentTab = 'inbox' | 'deck' | 'video';

/**
 * Main library view with sidebar navigation
 */
export function LibraryView() {
  const [currentTab, setCurrentTab] = useState<CurrentTab>('inbox');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    filteredCards,
    viewMode,
    isLoading,
    selectedCards,
    loadCards,
    deselectAll,
  } = useLibraryStore();

  // Load cards on mount
  useEffect(() => {
    loadCards();
  }, [loadCards]);

  // Handle click outside detail panel
  const handleBackdropClick = () => {
    deselectAll();
  };

  // Render content based on current tab
  const renderContent = () => {
    switch (currentTab) {
      case 'video':
        return <VideoLibrary />;
      case 'deck':
        return (
          <>
            <LibraryHeader />
            <FilterBadges />
            {selectedCards.size > 0 && <SelectionToolbar />}
            <main className="flex-1 overflow-y-auto p-6">
              <DeckView />
            </main>
          </>
        );
      case 'inbox':
      default:
        return (
          <>
            <LibraryHeader />
            <FilterBadges />
            {selectedCards.size > 0 && <SelectionToolbar />}
            <main className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <LoadingSkeleton />
              ) : filteredCards.length === 0 ? (
                <EmptyState />
              ) : viewMode === 'grid' ? (
                <CardGrid cards={filteredCards} />
              ) : (
                <CardList cards={filteredCards} />
              )}
            </main>
          </>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onOpenSettings={() => setSettingsOpen(true)}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>

      {/* Detail panel backdrop */}
      {selectedCards.size > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-40"
          onClick={handleBackdropClick}
        />
      )}

      {/* Detail panel */}
      {selectedCards.size > 0 && <CardDetail />}

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

/**
 * Loading skeleton while cards are fetching
 */
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-card rounded-lg border p-4 animate-pulse"
        >
          <div className="h-6 bg-muted rounded w-3/4 mb-3" />
          <div className="h-4 bg-muted rounded w-full mb-2" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
