import { motion } from 'framer-motion';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { X, Trash2, Download } from 'lucide-react';

/**
 * Selection toolbar for batch operations
 */
export function SelectionToolbar() {
  const { selectedCards, deselectAll, deleteCard } = useLibraryStore();
  const count = selectedCards.size;

  const handleDeleteAll = () => {
    if (
      window.confirm(
        `Are you sure you want to delete ${count} selected cards?`
      )
    ) {
      selectedCards.forEach((id) => deleteCard(id));
      deselectAll();
    }
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert(`Export ${count} cards (not yet implemented)`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-accent border-b border-border px-6 py-3 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-accent-foreground">
          {count} card{count > 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent-foreground/10 hover:bg-accent-foreground/20 text-accent-foreground rounded transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>

        <button
          onClick={handleDeleteAll}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>

        <button
          onClick={deselectAll}
          className="p-1.5 hover:bg-accent-foreground/20 rounded transition-colors"
          title="Deselect all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
