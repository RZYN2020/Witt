import { motion } from 'framer-motion';
import { CardPreview } from './CardPreview';
import type { Note } from '@/types';

interface CardGridProps {
  notes: Note[];
  displayMode?: 'notes' | 'cards';
}

/**
 * Grid layout for note display with responsive columns
 */
export function CardGrid({ notes }: CardGridProps) {
  // Display notes in grid layout
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {notes.map((note, index) => (
        <motion.div
          key={note.lemma}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
        >
          <CardPreview note={note} />
        </motion.div>
      ))}
    </motion.div>
  );
}
