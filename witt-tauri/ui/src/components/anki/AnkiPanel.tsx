import { RefreshCcw, Search, Wifi, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  checkAnki,
  listAnkiDecks,
  refreshAnkiCache,
  searchAnkiNotes,
  selectAnkiDeck,
  syncAnnotationsToAnki,
  type AnkiDeck,
  type AnkiNote,
} from '@/lib/commands';
import { Button } from '@/components/ui/Button';

interface AnkiPanelProps {
  onKnownWordsChange: (words: string[]) => void;
}

export function AnkiPanel({ onKnownWordsChange }: AnkiPanelProps) {
  const [online, setOnline] = useState(false);
  const [decks, setDecks] = useState<AnkiDeck[]>([]);
  const [notes, setNotes] = useState<AnkiNote[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('Ready');
  const selectedDeck = useMemo(() => decks.find((deck) => deck.selected)?.name || '', [decks]);

  const loadNotes = useCallback(
    async (deckName = selectedDeck, nextQuery = query) => {
      const nextNotes = await searchAnkiNotes(deckName || undefined, nextQuery || undefined);
      setNotes(nextNotes);
      onKnownWordsChange(nextNotes.map((note) => note.word));
    },
    [onKnownWordsChange, query, selectedDeck]
  );

  useEffect(() => {
    void Promise.all([checkAnki(), listAnkiDecks()]).then(([statusResult, nextDecks]) => {
      setOnline(statusResult.available);
      setDecks(nextDecks);
      const deck = nextDecks.find((item) => item.selected)?.name;
      if (deck) {
        void loadNotes(deck, '');
      }
    });
  }, [loadNotes]);

  const chooseDeck = async (deckName: string) => {
    await selectAnkiDeck(deckName);
    const nextDecks = await listAnkiDecks();
    setDecks(nextDecks);
    await loadNotes(deckName, '');
  };

  const refreshDeck = async () => {
    if (!selectedDeck) {
      setStatus('Select a deck first');
      return;
    }
    setStatus('Refreshing Anki cache...');
    const nextNotes = await refreshAnkiCache(selectedDeck);
    setNotes(nextNotes);
    onKnownWordsChange(nextNotes.map((note) => note.word));
    setStatus(`Cached ${nextNotes.length} cards`);
  };

  const syncQueued = async () => {
    setStatus('Syncing annotations...');
    const summary = await syncAnnotationsToAnki();
    setStatus(`Created ${summary.created}; ${summary.failed.length} failed`);
    if (selectedDeck) {
      await refreshDeck();
    }
  };

  return (
    <aside className="flex h-full flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Anki</h2>
            <p className="text-xs text-slate-500">{online ? 'AnkiConnect online' : 'Offline/cache only'}</p>
          </div>
          {online ? <Wifi className="text-emerald-600" size={18} /> : <WifiOff className="text-slate-400" size={18} />}
        </div>

        <select
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={selectedDeck}
          onChange={(event) => void chooseDeck(event.target.value)}
        >
          <option value="">Select deck</option>
          {decks.map((deck) => (
            <option key={deck.name} value={deck.name}>
              {deck.name}
            </option>
          ))}
        </select>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button size="sm" onClick={() => void refreshDeck()}>
            <RefreshCcw size={15} />
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => void syncQueued()}>
            Sync queued
          </Button>
        </div>

        <label className="mt-3 flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm">
          <Search size={15} />
          <input
            className="min-w-0 flex-1 outline-none"
            placeholder="Search cards"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              void loadNotes(selectedDeck, event.target.value);
            }}
          />
        </label>

        <p className="mt-3 text-xs text-slate-500">{status}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {notes.map((note) => (
          <article key={note.note_id} className="mb-2 rounded-md border border-slate-200 p-3">
            <h3 className="font-semibold">{note.word}</h3>
            {note.sentence && <p className="mt-1 line-clamp-3 text-sm text-slate-600">{note.sentence}</p>}
            {note.meaning && <p className="mt-2 line-clamp-4 text-xs text-slate-500">{note.meaning}</p>}
          </article>
        ))}
        {notes.length === 0 && (
          <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Select a deck and refresh to cache cards.
          </p>
        )}
      </div>
    </aside>
  );
}
