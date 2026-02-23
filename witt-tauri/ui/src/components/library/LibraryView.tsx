import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { AnkiSyncModal } from '@/components/anki/AnkiSyncModal';
import { NoteDetailModal } from './NoteDetailModal';
import { NoteListItem } from './NoteListItem';
import { LibraryHeader } from './LibraryHeader';
import { FilterBadges } from './FilterBadges';
import { EmptyState } from './EmptyState';
import { SelectionToolbar } from './SelectionToolbar';
import { VideoLibrary } from '@/components/video/VideoLibrary';
import { useLibraryStore } from '@/stores/useLibraryStore';
import type { Note } from '@/types';
import { ViewModeToggle } from './ViewModeToggle';
import { DeckFilter } from './DeckFilter';
import { Button } from '@/components/ui/Button';
import { Upload } from 'lucide-react';

type CurrentTab = 'inbox' | 'video';

/**
 * Main library view with sidebar navigation
 */
export function LibraryView() {
  const [currentTab, setCurrentTab] = useState<CurrentTab>('inbox');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ankiSyncOpen, setAnkiSyncOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const { filteredNotes, isLoading, selectedNotes, loadNotes } = useLibraryStore();

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Render content based on current tab
  const renderContent = () => {
    switch (currentTab) {
      case 'video':
        return <VideoLibrary />;
      case 'inbox':
      default:
        return (
          <>
            <LibraryHeader />
            <FilterBadges />
            {selectedNotes.size > 0 && <SelectionToolbar />}
            <main className="flex-1 overflow-y-auto p-6">
              {/* View Controls */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DeckFilter />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAnkiSyncOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Anki Sync</span>
                  </Button>
                  <ViewModeToggle />
                </div>
              </div>

              {isLoading ? (
                <LoadingSkeleton />
              ) : filteredNotes.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-2">
                  {filteredNotes.map((note) => (
                    <NoteListItem
                      key={note.lemma}
                      note={note}
                      onClick={() => setSelectedNote(note)}
                    />
                  ))}
                </div>
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
      <div className="flex-1 flex flex-col overflow-hidden">{renderContent()}</div>

      {/* Note Detail Modal */}
      {selectedNote && (
        <NoteDetailModal note={selectedNote} onClose={() => setSelectedNote(null)} />
      )}

      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Anki Sync Modal */}
      <AnkiSyncModal open={ankiSyncOpen} onClose={() => setAnkiSyncOpen(false)} />
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
        <div key={i} className="bg-card rounded-lg border p-4 animate-pulse">
          <div className="h-6 bg-muted rounded w-3/4 mb-3" />
          <div className="h-4 bg-muted rounded w-full mb-2" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      ))}
    </div>
  );
}
