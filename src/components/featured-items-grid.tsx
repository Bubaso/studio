
"use client";

import { useState, useEffect } from 'react';
import type { Item } from '@/lib/types';
import { ItemCard } from './item-card';
import { Skeleton } from './ui/skeleton';
import { useAuth } from '@/context/AuthContext';

interface FeaturedItemsGridProps {
  initialItems: Item[];
  maxItems?: number;
}

function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3 shadow-sm bg-card">
      <Skeleton className="h-40 w-full bg-muted/50" />
      <Skeleton className="h-6 w-3/4 bg-muted/50" />
      <Skeleton className="h-8 w-1/2 bg-muted/50" />
      <Skeleton className="h-4 w-1/2 bg-muted/50" />
      <Skeleton className="h-4 w-1/3 bg-muted/50" />
      <Skeleton className="h-10 w-full mt-2 bg-muted/50" />
    </div>
  );
}

export function FeaturedItemsGrid({ initialItems, maxItems = 8 }: FeaturedItemsGridProps) {
  const { firebaseUser: currentUser, authLoading } = useAuth();
  const [displayItems, setDisplayItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!authLoading) {
      let itemsToSet;
      if (currentUser) {
        itemsToSet = initialItems.filter(item => item.sellerId !== currentUser.uid).slice(0, maxItems);
      } else {
        itemsToSet = initialItems.slice(0, maxItems);
      }
      setDisplayItems(itemsToSet);
    }
  }, [currentUser, initialItems, maxItems, authLoading]);

  if (authLoading) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: maxItems }).map((_, index) => (
                <CardSkeleton key={index} />
            ))}
        </div>
    );
  }

  if (displayItems.length === 0 && !authLoading) {
     return <p className="text-center text-muted-foreground col-span-full">Aucun article à afficher pour le moment.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
      {displayItems.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
