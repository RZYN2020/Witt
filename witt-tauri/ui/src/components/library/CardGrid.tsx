import { motion } from 'framer-motion';
import { CardPreview } from './CardPreview';
import type { Card } from '@/types';

interface CardGridProps {
  cards: Card[];
}

/**
 * Grid layout for card display with responsive columns
 */
export function CardGrid({ cards }: CardGridProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {cards.map((card, index) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
        >
          <CardPreview card={card} />
        </motion.div>
      ))}
    </motion.div>
  );
}
