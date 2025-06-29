
"use client";

import { useEffect, useState } from 'react';
import { Eye, Heart, ListChecks } from 'lucide-react';
import { getUserListingsFromFirestore } from '@/services/itemService';
import type { Item } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';

interface ItemStatsDisplayProps {
  itemId: string;
  sellerId: string;
}

export function ItemStatsDisplay({ itemId, sellerId }: ItemStatsDisplayProps) {
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [favoriteCount, setFavoriteCount] = useState<number | null>(null);
  const [activeListingsCount, setActiveListingsCount] = useState<number | null>(null);

  useEffect(() => {
    if (itemId) {
      const fetchViewCount = async () => {
        try {
          const today = new Date();
          const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
          const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

          const viewsCollectionRef = collection(db, 'items', itemId, 'views');
          const q = query(
            viewsCollectionRef,
            where('timestamp', '>=', Timestamp.fromDate(startOfDay)),
            where('timestamp', '<=', Timestamp.fromDate(endOfDay))
          );
          const snapshot = await getDocs(q);
          setViewCount(snapshot.size);
        } catch (error) {
          console.error(`Error fetching today's view count for item ${itemId}:`, error);
          setViewCount(0);
        }
      };
      fetchViewCount();
    } else {
      setViewCount(0);
    }
  }, [itemId]);

  useEffect(() => {
    if (itemId) {
      const fetchFavoriteCount = async () => {
        try {
          const favoritesQuery = query(collection(db, 'userFavorites'), where('itemId', '==', itemId));
          const snapshot = await getDocs(favoritesQuery);
          setFavoriteCount(snapshot.size);
        } catch (error) {
          console.error(`Error fetching favorite count for item ${itemId}:`, error);
          setFavoriteCount(0);
        }
      };
      fetchFavoriteCount();
    } else {
      setFavoriteCount(0);
    }
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
    // Removed the condition that hid the stat if count was 0 for views or favorites.
    // Now, it will render "0 personnes ont vu..." or "0 personnes ont sauvegardé..."
    return (
      <div className="flex items-center text-xs text-muted-foreground mr-3 last:mr-0">
        <Icon className="h-3.5 w-3.5 mr-1" />
        {count} {text}
      </div>
    );
  };
  
  const allStatsLoaded = viewCount !== null && favoriteCount !== null && activeListingsCount !== null;
  const noMeaningfulStats = allStatsLoaded && viewCount === 0 && favoriteCount === 0 && activeListingsCount === 0;

  // If all stats are loaded and all are 0, then we hide the entire block.
  // Otherwise, we attempt to render stats. Individual stats (like views) will show even if 0,
  // unless this condition hides the whole block.
  if (noMeaningfulStats) {
      return null;
  }

  // If not all stats are loaded yet, and some might be 0 already, we still might want to show skeletons or early-loaded stats.
  // The noMeaningfulStats check is primarily for the case where *everything* is definitively 0.

  return (
    <div className="flex flex-wrap items-center mt-2 mb-3">
      {/* Render view count if loaded (not null), even if 0 */}
      {(viewCount !== null) && <StatItem icon={Eye} count={viewCount} text="personnes ont vu cet article aujourd'hui" />}
      
      {/* Render favorite count if loaded (not null), even if 0 */}
      {(favoriteCount !== null) && <StatItem icon={Heart} count={favoriteCount} text="personnes ont sauvegardé cet article" />}
      
      {/* Render active listings if loaded (not null), even if 0 */}
      {(activeListingsCount !== null && sellerId) && (
        <StatItem icon={ListChecks} count={activeListingsCount} text={`annonce(s) active(s) par ce vendeur`} />
      )}

      {/* Show skeletons for stats that are still loading */}
      {(viewCount === null) && <StatItem icon={Eye} count={null} text="personnes ont vu cet article aujourd'hui" />}
      {(favoriteCount === null) && <StatItem icon={Heart} count={null} text="personnes ont sauvegardé cet article" />}
      {(activeListingsCount === null && sellerId) && <StatItem icon={ListChecks} count={null} text="annonce(s) active(s) par ce vendeur" />}
    </div>
  );
}