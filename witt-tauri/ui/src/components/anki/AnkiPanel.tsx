import {
  AlertTriangle,
  Download,
  RefreshCcw,
  Search,
  Send,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { SelectInput, StatusText } from '@/components/ui/Form';
import { AnkiNoteList } from './AnkiNoteList';
import { AnkiSyncSettings } from './AnkiSyncSettings';
import { DEFAULT_MODEL, useAnkiPanel } from './useAnkiPanel';

interface AnkiPanelProps {
  onKnownWordsChange: (words: string[]) => void;
}

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </section>
  );
}

export function AnkiPanel({ onKnownWordsChange }: AnkiPanelProps) {
  const anki = useAnkiPanel({ onKnownWordsChange });

  return (
    <aside className="flex h-full flex-col border-l border-border bg-background text-foreground">
      <div className="space-y-4 border-b border-border p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Anki</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {anki.online ? 'Connected through AnkiConnect' : 'Offline cache view'}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-2">
            {anki.online ? (
              <Wifi className="text-emerald-600 dark:text-emerald-400" size={18} />
            ) : (
              <WifiOff className="text-muted-foreground" size={18} />
            )}
          </div>
        </div>

        <PanelSection title="Vocabulary source">
          <SelectInput
            className="px-3 py-2"
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

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button size="sm" onClick={() => void anki.refreshDeck()}>
              <RefreshCcw size={15} />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={() => void anki.syncQueued()}>
              <Send size={15} />
              Sync {anki.queuedCount || ''}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void anki.exportQueued()}>
              <Download size={15} />
              Export
            </Button>
          </div>
        </PanelSection>

        <AnkiSyncSettings
          defaultModel={DEFAULT_MODEL}
          editingEnabled={anki.showMapping}
          models={anki.models}
          pipelines={anki.pipelines}
          selectedModel={anki.selectedModel}
          settings={anki.settings}
          onEditPipeline={() => void anki.editPipeline()}
          onLoadPipeline={(pipelineId) => void anki.loadPipeline(pipelineId)}
          onSaveMapping={() => void anki.saveMapping()}
          onSettingsChange={anki.setSettings}
          onToggle={() => anki.setShowMapping((value) => !value)}
        />

        <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
          <Search size={15} />
          <input
            className="min-w-0 flex-1 bg-transparent outline-none"
            placeholder="Search cards"
            value={anki.query}
            onChange={(event) => anki.searchNotes(event.target.value)}
          />
        </label>

        <StatusText>{anki.status}</StatusText>

        {anki.conflicts.length > 0 && (
          <section className="rounded-md border border-amber-200 bg-amber-50/70 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
            <div className="flex items-center justify-between border-b border-amber-200 px-3 py-2 dark:border-amber-900/60">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                <AlertTriangle size={14} />
                Sync review
              </p>
              <span className="text-xs">{anki.conflicts.length}</span>
            </div>
            <div className="max-h-36 overflow-y-auto p-1">
              {anki.conflicts.map((conflict) => (
                <div
                  key={`${conflict.annotation_id}-${conflict.kind}`}
                  className="rounded px-2 py-1.5"
                >
                  <p className="truncate text-sm font-medium">{conflict.word}</p>
                  <p className="line-clamp-2 text-xs opacity-80">{conflict.detail}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {anki.queuedAnnotations.length > 0 && (
          <section className="rounded-md border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pending sync
              </p>
              <span className="text-xs text-muted-foreground">{anki.queuedAnnotations.length}</span>
            </div>
            <div className="max-h-44 overflow-y-auto p-1">
              {anki.queuedAnnotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{annotation.word}</p>
                    <p className="truncate text-xs text-muted-foreground">{annotation.sentence}</p>
                  </div>
                  <button
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-background hover:text-destructive"
                    title="Remove pending capture"
                    aria-label={`Remove pending capture for ${annotation.word}`}
                    onClick={() => void anki.deleteQueued(annotation.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Cached cards
        </p>
        <AnkiNoteList notes={anki.notes} />
      </div>
    </aside>
  );
}
