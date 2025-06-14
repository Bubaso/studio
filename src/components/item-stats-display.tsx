
"use client";

import { useEffect, useState } from 'react';
import { Eye, Heart, ListChecks } from 'lucide-react';
import { getUserListingsFromFirestore } from '@/services/itemService';
import type { Item } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase'; // Import db
import { collection, query, where, onSnapshot, Timestamp, Unsubscribe } from 'firebase/firestore'; // Import necessary Firestore functions

interface ItemStatsDisplayProps {
  itemId: string;
  sellerId: string;
}

export function ItemStatsDisplay({ itemId, sellerId }: ItemStatsDisplayProps) {
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [favoriteCount, setFavoriteCount] = useState<number | null>(null);
  const [activeListingsCount, setActiveListingsCount] = useState<number | null>(null);

  useEffect(() => {
    let unsubscribeViews: Unsubscribe = () => {};
    if (itemId) {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

      const viewsCollectionRef = collection(db, 'items', itemId, 'views');
      const q = query(
        viewsCollectionRef,
        where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
        where('timestamp', '<=', Timestamp.fromDate(endOfDay))
      );
      unsubscribeViews = onSnapshot(
        q,
        (snapshot) => setViewCount(snapshot.size),
        (error) => {
          console.error(`Error fetching today's view count for item ${itemId}:`, error);
          setViewCount(0);
        }
      );
    } else {
      setViewCount(0);
    }
    return () => unsubscribeViews();
  }, [itemId]);

  useEffect(() => {
    let unsubscribeFavorites: Unsubscribe = () => {};
    if (itemId) {
      const favoritesQuery = query(collection(db, 'userFavorites'), where('itemId', '==', itemId));
      unsubscribeFavorites = onSnapshot(
        favoritesQuery,
        (snapshot) => setFavoriteCount(snapshot.size),
        (error) => {
          console.error(`Error fetching favorite count for item ${itemId}:`, error);
          setFavoriteCount(0);
        }
      );
    } else {
      setFavoriteCount(0);
    }
    return () => unsubscribeFavorites();
  }, [itemId]);

  useEffect(() => {
    if (sellerId) {
      getUserListingsFromFirestore(sellerId)
        .then(listings => setActiveListingsCount(listings.length))
        .catch(err => {
          console.error("Failed to fetch seller's active listings:", err);
          setActiveListingsCount(0);
        });
    } else {
        setActiveListingsCount(0);
    }
  }, [sellerId]);

  const StatItem = ({ icon: Icon, count, text }: { icon: React.ElementType, count: number | null, text: string }) => {
    if (count === null) {
      return (
        <div className="flex items-center text-xs text-muted-foreground mr-3 last:mr-0">
          <Icon className="h-3.5 w-3.5 mr-1" />
          <Skeleton className="h-3 w-16 bg-muted/50" />
        </div>
      );
    }
    // Only hide if explicitly 0 for views or favorites. Seller listings can be 0.
    if (count === 0 && (text.includes("vu cet article") || text.includes("sauvegardé cet article"))) return null;

    return (
      <div className="flex items-center text-xs text-muted-foreground mr-3 last:mr-0">
        <Icon className="h-3.5 w-3.5 mr-1" />
        {count} {text}
      </div>
    );
  };
  
  const noMeaningfulStats = (viewCount === 0 || viewCount === null) && 
                           (favoriteCount === 0 || favoriteCount === null) && 
                           (activeListingsCount === 0 || activeListingsCount === null);

  if (noMeaningfulStats) {
      return null;
  }

  return (
    <div className="flex flex-wrap items-center mt-2 mb-3">
      <StatItem icon={Eye} count={viewCount} text="personnes ont vu cet article aujourd'hui" />
      <StatItem icon={Heart} count={favoriteCount} text="personnes ont sauvegardé cet article" />
      {sellerId && (
        <StatItem icon={ListChecks} count={activeListingsCount} text={`annonce(s) active(s) par ce vendeur`} />
      )}
    </div>
  );
}
