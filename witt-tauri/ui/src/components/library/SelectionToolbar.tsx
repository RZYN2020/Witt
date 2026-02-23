import { useLibraryStore } from '@/stores/useLibraryStore';
import { cn } from '@/lib/utils';

interface SelectionToolbarProps {
  className?: string;
}

export function SelectionToolbar({ className }: SelectionToolbarProps) {
  const { selectedNotes, deleteNote } = useLibraryStore();
  const selectedCount = selectedNotes.size;

  const handleDeleteSelected = async () => {
    if (!confirm(`Delete ${selectedCount} selected notes?`)) return;

    for (const lemma of Array.from(selectedNotes)) {
      await deleteNote(lemma);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-4 z-40',
        className
      )}
    >
      <span className="text-sm font-medium">{selectedCount} selected</span>
      <button onClick={handleDeleteSelected} className="text-sm hover:underline">
        Delete
      </button>
    </div>
  );
}
