import { motion } from 'framer-motion';
import { CardPreview } from './CardPreview';
import type { Card } from '@/types';

interface CardListProps {
  cards: Card[];
}

/**
 * List layout for card display with dense rows
 */
export function CardList({ cards }: CardListProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-2"
    >
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.02 }}
        >
          <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
            <CardPreview card={card} compact />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
