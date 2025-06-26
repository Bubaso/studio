
"use client";

import type { Item } from '@/lib/types';
import { ItemCard } from './item-card';

interface PersonalizedRecommendationsProps {
  items: Item[];
}

export function PersonalizedRecommendations({ items }: PersonalizedRecommendationsProps) {
  if (!items || items.length === 0) {
    return null; // Don't render anything if there are no items
  }

  return (
    <section className="py-4 md:py-6">
      <h2 className="text-xl sm:text-2xl font-bold font-headline text-center mb-4 md:mb-6 text-primary">
        Spécialement pour vous
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
