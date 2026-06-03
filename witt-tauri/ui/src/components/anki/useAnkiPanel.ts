import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  checkAnki,
  deleteQueuedAnnotation,
  exportQueuedAnnotationsTsv,
  getSettings,
  listAnkiSyncConflicts,
  listAnnotations,
  listAnkiDecks,
  listAnkiModels,
  listPipelineProfiles,
  loadPipelineProfile,
  openPipelineProfile,
  refreshAnkiCache,
  saveSettings,
  searchAnkiNotes,
  selectAnkiDeck,
  syncAnnotationsToAnki,
  type Annotation,
  type AnkiDeck,
  type AnkiModelInfo,
  type AnkiNote,
  type AnkiSyncConflict,
  type AppSettings,
  type PipelineProfile,
  DEFAULT_APP_SETTINGS,
} from '@/lib/commands';

export const DEFAULT_MODEL: AnkiModelInfo = {
  name: DEFAULT_APP_SETTINGS.anki_model_name,
  fields: ['Word', 'Sentence', 'Book', 'Chapter', 'Meaning'],
};

interface UseAnkiPanelArgs {
  onKnownWordsChange: (words: string[]) => void;
}

export function useAnkiPanel({ onKnownWordsChange }: UseAnkiPanelArgs) {
  const [online, setOnline] = useState(false);
  const [decks, setDecks] = useState<AnkiDeck[]>([]);
  const [notes, setNotes] = useState<AnkiNote[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [conflicts, setConflicts] = useState<AnkiSyncConflict[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [models, setModels] = useState<AnkiModelInfo[]>([DEFAULT_MODEL]);
  const [pipelines, setPipelines] = useState<PipelineProfile[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Ready');

  const selectedDeck = useMemo(() => decks.find((deck) => deck.selected)?.name || '', [decks]);
  const selectedModel = useMemo(
    () => models.find((model) => model.name === settings.anki_model_name) ?? DEFAULT_MODEL,
    [models, settings.anki_model_name]
  );
  const queuedAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.status !== 'synced'),
    [annotations]
  );
  const queuedCount = queuedAnnotations.length;
  const flashStatus = useCallback((message: string, durationMs = 3000) => {
    setStatus(message);
    setTimeout(() => setStatus((prev) => (prev === message ? 'Ready' : prev)), durationMs);
  }, []);

  const loadNotes = useCallback(
    async (deckName: string, nextQuery: string) => {
      const nextNotes = await searchAnkiNotes(deckName || undefined, nextQuery || undefined);
      setNotes(nextNotes);
      onKnownWordsChange(nextNotes.map((note) => note.word));
    },
    [onKnownWordsChange]
  );

  const publishKnownWords = useCallback(
    (nextNotes: AnkiNote[], nextAnnotations: Annotation[]) => {
      onKnownWordsChange(
        Array.from(
          new Set([
            ...nextNotes.map((note) => note.word),
            ...nextAnnotations.map((annotation) => annotation.word),
          ])
        )
      );
    },
    [onKnownWordsChange]
  );

  const loadAnnotations = useCallback(async () => {
    const nextAnnotations = await listAnnotations();
    setAnnotations(nextAnnotations);
    setConflicts(await listAnkiSyncConflicts());
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const nextModels = await listAnkiModels();
      setModels(nextModels.length ? nextModels : [DEFAULT_MODEL]);
    } catch {
      setModels([DEFAULT_MODEL]);
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      checkAnki(),
      listAnkiDecks(),
      getSettings(),
      loadAnnotations(),
      loadModels(),
      listPipelineProfiles().catch(() => []),
    ]).then(([statusResult, nextDecks, nextSettings, , , nextPipelines]) => {
      setOnline(statusResult.available);
      setDecks(nextDecks);
      setSettings(nextSettings);
      setPipelines(nextPipelines);
      const deck = nextDecks.find((item) => item.selected)?.name;
      if (deck) {
        void loadNotes(deck, '');
      }
    });
  }, [loadAnnotations, loadModels, loadNotes]);

  const chooseDeck = async (deckName: string) => {
    await selectAnkiDeck(deckName);
    const nextDecks = await listAnkiDecks();
    setDecks(nextDecks);
    await loadNotes(deckName, '');
    setConflicts(await listAnkiSyncConflicts());
  };

  const refreshDeck = async () => {
    if (!selectedDeck) {
      setStatus('Select a deck first');
      return;
    }
    setStatus('Refreshing Anki cache...');
    try {
      const nextNotes = await refreshAnkiCache(selectedDeck);
      setNotes(nextNotes);
      setConflicts(await listAnkiSyncConflicts());
      publishKnownWords(nextNotes, annotations);
      flashStatus(`Cached ${nextNotes.length} cards`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Refresh failed');
    }
  };

  const syncQueued = async () => {
    setStatus('Syncing annotations...');
    try {
      await saveSettings(settings);
      const summary = await syncAnnotationsToAnki();
      flashStatus(`Created ${summary.created}; ${summary.failed.length} failed`);
      const nextAnnotations = await listAnnotations();
      setAnnotations(nextAnnotations);
      setConflicts(await listAnkiSyncConflicts());
      if (selectedDeck) {
        await refreshDeck();
      } else {
        publishKnownWords(notes, nextAnnotations);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Sync failed');
    }
  };

  const saveMapping = async () => {
    try {
      await saveSettings(settings);
      flashStatus('Mapping saved');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const deleteQueued = async (annotationId: string) => {
    try {
      await deleteQueuedAnnotation(annotationId);
      const nextAnnotations = await listAnnotations();
      setAnnotations(nextAnnotations);
      setConflicts(await listAnkiSyncConflicts());
      publishKnownWords(notes, nextAnnotations);
      flashStatus('Removed pending capture');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const editPipeline = async () => {
    try {
      await openPipelineProfile(settings.anki_pipeline_id);
      setStatus('Opened config in external editor');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Failed to open config');
    }
  };

  const loadPipeline = async (pipelineId: string) => {
    setSettings(await loadPipelineProfile(pipelineId));
  };

  const searchNotes = (nextQuery: string) => {
    setQuery(nextQuery);
    void loadNotes(selectedDeck, nextQuery);
  };

  const exportQueued = async () => {
    setStatus('Exporting queued captures...');
    try {
      await saveSettings(settings);
      const summary = await exportQueuedAnnotationsTsv();
      flashStatus(`Exported ${summary.exported} rows to ${summary.path}`, 6000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Export failed');
    }
  };

  return {
    online,
    decks,
    notes,
    models,
    pipelines,
    settings,
    selectedDeck,
    selectedModel,
    showMapping,
    query,
    status,
    queuedCount,
    queuedAnnotations,
    conflicts,
    chooseDeck,
    deleteQueued,
    editPipeline,
    exportQueued,
    loadPipeline,
    refreshDeck,
    saveMapping,
    searchNotes,
    setSettings,
    setShowMapping,
    syncQueued,
  };
}
