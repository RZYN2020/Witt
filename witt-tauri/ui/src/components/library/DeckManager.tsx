import { useState } from 'react';

interface DeckManagerProps {
  notes: any[];
  onCreateDeck: (deckName: string) => void;
  onDeleteDeck: (deckName: string) => void;
  onRenameDeck: (oldName: string, newName: string) => void;
}

/**
 * Deck management component for organizing notes into decks
 */
export function DeckManager({ notes, onCreateDeck, onDeleteDeck, onRenameDeck }: DeckManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [editingDeck, setEditingDeck] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Group notes by deck
  const decks = Array.from(new Set(notes.map((n) => n.deck))).sort();

  const handleCreate = () => {
    if (newDeckName.trim()) {
      onCreateDeck(newDeckName.trim());
      setNewDeckName('');
      setIsCreating(false);
    }
  };

  const handleRename = (oldName: string) => {
    if (renameValue.trim() && renameValue.trim() !== oldName) {
      onRenameDeck(oldName, renameValue.trim());
      setRenameValue('');
      setEditingDeck(null);
    }
  };

  return (
    <div className="deck-manager space-y-6 p-6 bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Manage Decks</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Organize your notes into decks for better learning
          </p>
        </div>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            + New Deck
          </button>
        )}
      </div>

      {/* Create Deck Form */}
      {isCreating && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Deck Name</label>
            <input
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsCreating(false);
              }}
              placeholder="Enter deck name (e.g., 'English Learning', 'Business Terms')"
              className="w-full px-4 py-3 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
            >
              Create Deck
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Decks List */}
      <div className="space-y-3">
        {decks.map((deckName) => (
          <DeckItem
            key={deckName}
            name={deckName}
            count={notes.filter((n) => n.deck === deckName).length}
            isEditing={editingDeck === deckName}
            renameValue={renameValue}
            onEdit={() => {
              setEditingDeck(deckName);
              setRenameValue(deckName);
            }}
            onRename={() => handleRename(deckName)}
            onDelete={() => onDeleteDeck(deckName)}
            setRenameValue={setRenameValue}
          />
        ))}

        {decks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
            <p>No decks yet</p>
            <button
              onClick={() => setIsCreating(true)}
              className="mt-3 text-primary hover:underline text-sm font-medium"
            >
              Create your first deck
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface DeckItemProps {
  name: string;
  count: number;
  isEditing: boolean;
  renameValue: string;
  onEdit: () => void;
  onRename: () => void;
  onDelete: () => void;
  setRenameValue: (value: string) => void;
}

function DeckItem({
  name,
  count,
  isEditing,
  renameValue,
  onEdit,
  onRename,
  onDelete,
  setRenameValue,
}: DeckItemProps) {
  const isDefault = name === 'Default';

  if (isEditing) {
    return (
      <div className="deck-item p-4 border border-primary rounded-lg bg-card">
        <div className="flex gap-3">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRename();
              if (e.key === 'Escape') onEdit();
            }}
            className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
          />
          <button
            onClick={onRename}
            className="px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            Save
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="deck-item border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
      {/* Deck Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-foreground">{name}</h4>
            <p className="text-sm text-muted-foreground">
              {count} note{count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isDefault && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 hover:bg-accent rounded transition-colors"
                title="Rename deck"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="p-2 hover:bg-destructive/20 text-destructive rounded transition-colors"
                title="Delete deck"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
