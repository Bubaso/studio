
"use client";

import { useState, useEffect } from 'react';
import type { Item } from '@/lib/types';
import { ItemCard } from './item-card';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { Skeleton } from './ui/skeleton'; // For loading state

interface FeaturedItemsGridProps {
  initialItems: Item[];
  maxItems?: number;
}

function CardSkeleton() { // Re-define or import if used elsewhere
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


export function FeaturedItemsGrid({ initialItems, maxItems = 4 }: FeaturedItemsGridProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [displayItems, setDisplayItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start with loading true

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      // Filter items once auth state is known
      let itemsToSet;
      if (user) {
        itemsToSet = initialItems.filter(item => item.sellerId !== user.uid).slice(0, maxItems);
      } else {
        itemsToSet = initialItems.slice(0, maxItems);
      }
      setDisplayItems(itemsToSet);
      setIsLoading(false); // Set loading to false after auth check and initial filter
    });
    return () => unsubscribe();
  }, [initialItems, maxItems]); // Rerun if initialItems or maxItems change

  // This effect handles changes if currentUser logs in/out after initial load
  useEffect(() => {
    if (!isLoading) { // Only re-filter if not initial loading
      let itemsToSet;
      if (currentUser) {
        itemsToSet = initialItems.filter(item => item.sellerId !== currentUser.uid).slice(0, maxItems);
      } else {
        itemsToSet = initialItems.slice(0, maxItems);
      }
      setDisplayItems(itemsToSet);
    }
  }, [currentUser, initialItems, maxItems, isLoading]);


  if (isLoading) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: maxItems }).map((_, index) => (
                <CardSkeleton key={index} />
            ))}
        </div>
    );
  }

  if (displayItems.length === 0 && !isLoading) {
     // Optionally show a message if no items are left after filtering
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
