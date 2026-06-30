import {
  AlertTriangle,
  Download,
  RefreshCcw,
  Search,
  Send,
  Trash2,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { SelectInput, StatusText } from '@/components/ui/Form';
import { ProfileEditor } from '@/components/ui/ProfileEditor';
import { readPipelineProfile, savePipelineProfile } from '@/lib/commands';
import { AnkiNoteList } from './AnkiNoteList';
import { AnkiSyncSettings } from './AnkiSyncSettings';
import { DEFAULT_MODEL, useAnkiPanel } from './useAnkiPanel';

interface AnkiPanelProps {
  onKnownWordsChange: (words: string[]) => void;
}

export function AnkiPanel({ onKnownWordsChange }: AnkiPanelProps) {
  const anki = useAnkiPanel({ onKnownWordsChange });
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [editingPipelineContent, setEditingPipelineContent] = useState('');
  const [editingPipelineName, setEditingPipelineName] = useState('');

  const editPipelineInline = async () => {
    const pipelineId = anki.settings.anki_pipeline_id;
    try {
      const content = await readPipelineProfile(pipelineId);
      setEditingPipelineId(pipelineId);
      setEditingPipelineContent(content);
      setEditingPipelineName(anki.pipelines.find((p) => p.id === pipelineId)?.name ?? pipelineId);
    } catch (err) {
      anki.flashStatus(err instanceof Error ? err.message : 'Failed to read pipeline');
    }
  };

  const savePipelineInline = async (content: string) => {
    if (!editingPipelineId) {
      return;
    }
    await savePipelineProfile(editingPipelineId, content);
    await anki.loadPipeline(editingPipelineId);
  };

  return (
    <aside className="flex h-full flex-col border-l border-border bg-background text-foreground">
      <div className="shrink-0 space-y-3 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Anki</h2>
          {anki.online ? (
            <Wifi size={14} className="text-emerald-500" />
          ) : (
            <WifiOff size={14} className="text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground">
            {anki.online ? 'AnkiConnect' : 'Offline'}
          </span>
        </div>

        <SelectInput
          value={anki.selectedDeck}
          onChange={(event) => void anki.chooseDeck(event.target.value)}
          aria-label="Anki deck"
        >
          <option value="">Select deck</option>
          {anki.decks.map((deck) => (
            <option key={deck.name} value={deck.name}>
              {deck.name}
            </option>
          ))}
        </SelectInput>

        <div className="grid grid-cols-2 gap-1.5">
          <Button size="sm" variant="outline" onClick={() => void anki.refreshDeck()}>
            <RefreshCcw size={14} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => void anki.syncQueued()}>
            <Send size={14} />
            Sync{anki.queuedCount ? ` ${anki.queuedCount}` : ''}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void anki.exportQueued()}>
            <Download size={14} />
            Export
          </Button>
          <Button size="sm" variant="outline" onClick={() => void anki.pushAnkiWeb()}>
            <Upload size={14} />
            Web
          </Button>
        </div>

        <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm">
          <Search size={14} className="text-muted-foreground" />
          <input
            className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            placeholder="Search cards..."
            value={anki.query}
            onChange={(event) => anki.searchNotes(event.target.value)}
          />
        </label>

        <AnkiSyncSettings
          defaultModel={DEFAULT_MODEL}
          editingEnabled={anki.showMapping}
          models={anki.models}
          pipelines={anki.pipelines}
          selectedModel={anki.selectedModel}
          settings={anki.settings}
          onEditPipeline={() => void anki.editPipeline()}
          onEditPipelineInline={() => void editPipelineInline()}
          onLoadPipeline={(pipelineId) => void anki.loadPipeline(pipelineId)}
          onSaveMapping={() => void anki.saveMapping()}
          onSettingsChange={anki.setSettings}
          onToggle={() => anki.setShowMapping((value) => !value)}
        />

        <StatusText>{anki.status}</StatusText>

        {anki.conflicts.length > 0 && (
          <section className="rounded-md border border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
            <div className="flex items-center justify-between px-3 py-1.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <AlertTriangle size={13} />
                Sync review
              </p>
              <span className="text-xs">{anki.conflicts.length}</span>
            </div>
            <div className="max-h-32 overflow-y-auto px-1 pb-1">
              {anki.conflicts.map((conflict) => (
                <div
                  key={`${conflict.annotation_id}-${conflict.kind}`}
                  className="rounded px-2 py-1 text-xs"
                >
                  <p className="truncate font-medium">{conflict.word}</p>
                  <p className="line-clamp-1 opacity-80">{conflict.detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {anki.queuedAnnotations.length > 0 && (
          <section className="rounded-md border border-border bg-card">
            <div className="flex items-center justify-between px-3 py-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pending sync
              </p>
              <span className="text-xs text-muted-foreground">{anki.queuedAnnotations.length}</span>
            </div>
            <div className="max-h-40 overflow-y-auto px-1 pb-1">
              {anki.queuedAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{annotation.word}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {annotation.sentence}
                    </p>
                  </div>
                  <button
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-background hover:text-destructive"
                    title="Remove pending capture"
                    aria-label={`Remove pending capture for ${annotation.word}`}
                    onClick={() => void anki.deleteQueued(annotation.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cached cards
        </p>
        <AnkiNoteList notes={anki.notes} />
      </div>

      {editingPipelineId && (
        <ProfileEditor
          title={`Edit Pipeline: ${editingPipelineName}`}
          initialContent={editingPipelineContent}
          onSave={savePipelineInline}
          onClose={() => setEditingPipelineId(null)}
        />
      )}
    </aside>
  );
}
