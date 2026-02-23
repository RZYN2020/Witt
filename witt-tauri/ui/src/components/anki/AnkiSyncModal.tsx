import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Upload, RefreshCw, Settings, Check, AlertCircle } from 'lucide-react';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { cn } from '@/lib/utils';
import * as anki from '@/lib/anki';
import { DownloadDialog } from '@/components/ui/DownloadDialog';

interface AnkiSyncModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Anki synchronization modal
 */
export function AnkiSyncModal({ open, onClose }: AnkiSyncModalProps) {
  const { notes, getDecks } = useLibraryStore();
  const { autoSyncToAnki, setAutoSyncToAnki } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'export' | 'sync' | 'settings'>('sync');
  const [selectedDeck, setSelectedDeck] = useState<string>('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<anki.SyncResult | null>(null);
  const [ankiStatus, setAnkiStatus] = useState<anki.AnkiStatus | null>(null);

  // Download dialog state
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState<'downloading' | 'completed' | 'error'>(
    'downloading'
  );
  const [downloadPath, setDownloadPath] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string>('');

  // Check AnkiConnect status on open
  useEffect(() => {
    if (open) {
      checkAnkiStatus();
    }
  }, [open]);

  const checkAnkiStatus = async () => {
    try {
      const status = await anki.checkAnkiConnect();
      setAnkiStatus(status);
    } catch (error) {
      setAnkiStatus({ available: false });
    }
  };

  const getFilteredNotes = () => {
    if (selectedDeck === 'all') {
      return notes;
    }
    return notes.filter((note) => note.deck === selectedDeck);
  };

  const handleExport = async () => {
    const filteredNotes = getFilteredNotes();
    const lemmas = filteredNotes.map((n) => n.lemma);
    const deckName = selectedDeck === 'all' ? undefined : selectedDeck;
    const fileName = `witt-export-${deckName || 'all'}-${new Date().toISOString().split('T')[0]}.apkg`;

    // Show download dialog
    setShowDownloadDialog(true);
    setDownloadStatus('downloading');
    setDownloadProgress(0);
    setDownloadPath(fileName);
    setDownloadError('');

    // Simulate progress
    const progressInterval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      // Generate APKG file
      const apkgBlob = await anki.exportToAPKG(lemmas, filteredNotes);
      clearInterval(progressInterval);
      setDownloadProgress(100);
      setDownloadStatus('completed');

      // Save file using Tauri dialog
      try {
        const dialog = await import('@tauri-apps/plugin-dialog');
        const savePath = await dialog.save({
          filters: [
            {
              name: 'APKG',
              extensions: ['apkg'],
            },
          ],
          defaultPath: fileName,
        });

        if (savePath) {
          const fs = await import('@tauri-apps/plugin-fs');
          const arrayBuffer = await apkgBlob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          await fs.writeFile(savePath, uint8Array);
          setDownloadPath(savePath);
        } else {
          // User cancelled, just download to browser
          anki.downloadAPKG(apkgBlob, fileName);
          setDownloadPath(`Downloaded: ${fileName} (${(apkgBlob.size / 1024).toFixed(1)} KB)`);
        }
      } catch (error) {
        // Fallback to browser download
        console.error('Tauri save failed, using browser download:', error);
        anki.downloadAPKG(apkgBlob, fileName);
        setDownloadPath(`Downloaded: ${fileName} (${(apkgBlob.size / 1024).toFixed(1)} KB)`);
      }
    } catch (error) {
      clearInterval(progressInterval);
      setDownloadStatus('error');
      setDownloadError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleOpenLocation = async () => {
    if (downloadPath && downloadPath.startsWith('Downloaded:')) {
      // Browser download, can't open location
      alert("File was downloaded to your browser's default download folder.");
      return;
    }

    if (downloadPath) {
      try {
        // Use Tauri shell to open file location
        const shell = await import('@tauri-apps/plugin-shell');
        const pathApi = await import('@tauri-apps/api/path');
        const parentDir = await pathApi.dirname(downloadPath);
        await shell.open(parentDir);
      } catch (error) {
        console.error('Failed to open location:', error);
        alert('Failed to open file location. Path: ' + downloadPath);
      }
    }
  };

  const handleSync = async () => {
    const filteredNotes = getFilteredNotes();
    const lemmas = filteredNotes.map((n) => n.lemma);

    setIsSyncing(true);
    setSyncResult(null);

    try {
      const result = await anki.syncToAnki(lemmas);
      setSyncResult(result);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncResult({
        success: false,
        created: 0,
        updated: 0,
        failed: [{ lemma: 'Error', error: String(error) }],
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const decks = getDecks();

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="w-full max-w-2xl max-h-[85vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto mx-4">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      ankiStatus?.available ? 'bg-green-500/10' : 'bg-red-500/10'
                    )}
                  >
                    {ankiStatus?.available ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Anki Sync</h2>
                    <p className="text-sm text-muted-foreground">
                      {ankiStatus?.available
                        ? `Connected (v${ankiStatus.version})`
                        : 'AnkiConnect not available'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                <TabButton
                  active={activeTab === 'sync'}
                  onClick={() => setActiveTab('sync')}
                  icon={RefreshCw}
                  label="Sync"
                />
                <TabButton
                  active={activeTab === 'export'}
                  onClick={() => setActiveTab('export')}
                  icon={Download}
                  label="Export"
                />
                <TabButton
                  active={activeTab === 'settings'}
                  onClick={() => setActiveTab('settings')}
                  icon={Settings}
                  label="Settings"
                />
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {activeTab === 'sync' && (
                  <SyncTab
                    selectedDeck={selectedDeck}
                    setSelectedDeck={setSelectedDeck}
                    decks={decks}
                    notes={getFilteredNotes()}
                    isSyncing={isSyncing}
                    syncResult={syncResult}
                    ankiAvailable={ankiStatus?.available ?? false}
                    onSync={handleSync}
                    onRefresh={checkAnkiStatus}
                  />
                )}

                {activeTab === 'export' && (
                  <ExportTab
                    selectedDeck={selectedDeck}
                    setSelectedDeck={setSelectedDeck}
                    decks={decks}
                    notes={getFilteredNotes()}
                    onExport={handleExport}
                  />
                )}

                {activeTab === 'settings' && (
                  <SettingsTab
                    autoSync={autoSyncToAnki}
                    onToggleAutoSync={() => setAutoSyncToAnki(!autoSyncToAnki)}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Download Dialog */}
      <DownloadDialog
        open={showDownloadDialog}
        onClose={() => setShowDownloadDialog(false)}
        fileName={`witt-export-${selectedDeck === 'all' ? 'all' : selectedDeck}-${new Date().toISOString().split('T')[0]}.apkg`}
        filePath={downloadPath}
        progress={downloadProgress}
        status={downloadStatus}
        errorMessage={downloadError}
        onOpenLocation={handleOpenLocation}
      />
    </AnimatePresence>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}

function TabButton({ active, onClick, icon: Icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
        active
          ? 'text-primary border-b-2 border-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

interface SyncTabProps {
  selectedDeck: string;
  setSelectedDeck: (deck: string) => void;
  decks: string[];
  notes: any[];
  isSyncing: boolean;
  syncResult: anki.SyncResult | null;
  ankiAvailable: boolean;
  onSync: () => void;
  onRefresh: () => void;
}

function SyncTab({
  selectedDeck,
  setSelectedDeck,
  decks,
  notes,
  isSyncing,
  syncResult,
  ankiAvailable,
  onSync,
  onRefresh,
}: SyncTabProps) {
  return (
    <div className="space-y-6">
      {/* Deck Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Select Deck to Sync
        </label>
        <select
          value={selectedDeck}
          onChange={(e) => setSelectedDeck(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Decks ({decks.reduce((sum: number) => sum + 1, 0)} notes)</option>
          {decks.map((deck) => (
            <option key={deck} value={deck}>
              {deck}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {notes.length} note{notes.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-xs text-muted-foreground mt-1">Will be synced to Anki</p>
          </div>
          <button
            onClick={onRefresh}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title="Refresh Anki status"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div
          className={cn(
            'p-4 rounded-lg',
            syncResult.success
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          )}
        >
          <div className="flex items-start gap-3">
            {syncResult.success ? (
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={cn(
                  'text-sm font-medium',
                  syncResult.success ? 'text-green-600' : 'text-red-600'
                )}
              >
                {syncResult.success ? 'Sync Completed' : 'Sync Failed'}
              </p>
              {syncResult.success && (
                <p className="text-sm text-green-600/80 mt-1">
                  Created: {syncResult.created} • Updated: {syncResult.updated}
                </p>
              )}
              {!syncResult.success && syncResult.failed.length > 0 && (
                <ul className="text-sm text-red-600/80 mt-1 space-y-1">
                  {syncResult.failed.map((f, i) => (
                    <li key={i}>
                      {f.lemma}: {f.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sync Button */}
      <button
        onClick={onSync}
        disabled={isSyncing || !ankiAvailable}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
          isSyncing || !ankiAvailable
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
      >
        {isSyncing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Syncing...</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span>Sync to Anki</span>
          </>
        )}
      </button>

      {!ankiAvailable && (
        <p className="text-xs text-muted-foreground text-center">
          Make sure Anki is running and AnkiConnect is installed
        </p>
      )}
    </div>
  );
}

interface ExportTabProps {
  selectedDeck: string;
  setSelectedDeck: (deck: string) => void;
  decks: string[];
  notes: any[];
  onExport: () => void;
}

function ExportTab({ selectedDeck, setSelectedDeck, decks, notes, onExport }: ExportTabProps) {
  return (
    <div className="space-y-6">
      {/* Deck Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Select Deck to Export
        </label>
        <select
          value={selectedDeck}
          onChange={(e) => setSelectedDeck(e.target.value)}
          className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <option value="all">All Decks</option>
          {decks.map((deck) => (
            <option key={deck} value={deck}>
              {deck}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <div className="p-4 bg-muted/50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-foreground">
            {notes.length} note{notes.length !== 1 ? 's' : ''} selected
          </p>
          <p className="text-xs text-muted-foreground mt-1">Will be exported to APKG file</p>
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={onExport}
        className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        <span>Export to APKG</span>
      </button>
    </div>
  );
}

interface SettingsTabProps {
  autoSync: boolean;
  onToggleAutoSync: () => void;
}

function SettingsTab({ autoSync, onToggleAutoSync }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <div className="p-4 border border-border rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-foreground">Auto-sync to Anki</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Automatically sync new cards to Anki when created
            </p>
          </div>
          <button
            onClick={onToggleAutoSync}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors',
              autoSync ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform',
                autoSync && 'translate-x-5'
              )}
            />
          </button>
        </div>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg">
        <h3 className="text-sm font-medium text-foreground mb-2">AnkiConnect Settings</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Endpoint</span>
            <span className="text-foreground font-mono">http://localhost:8765</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="text-green-600">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}
