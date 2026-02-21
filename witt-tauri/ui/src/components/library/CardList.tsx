import { motion } from 'framer-motion';
import { CardPreview } from './CardPreview';
import type { Note } from '@/types';

interface CardListProps {
  notes: Note[];
  displayMode?: 'notes' | 'cards';
}

/**
 * List layout for note display with dense rows
 */
export function CardList({ notes }: CardListProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {notes.map((note, index) => (
        <motion.div
          key={note.lemma}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
            <CardPreview note={note} />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
