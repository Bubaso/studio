
"use client";

import { useEffect, useState } from 'react';
import { Eye, Heart, ListChecks } from 'lucide-react';
import { getUserListingsFromFirestore } from '@/services/itemService';
import type { Item } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useTranslations } from 'next-intl';

interface ItemStatsDisplayProps {
  itemId: string;
  sellerId: string;
}

export function ItemStatsDisplay({ itemId, sellerId }: ItemStatsDisplayProps) {
  const t = useTranslations('ItemStats');
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

  const StatItem = ({ icon: Icon, count, message }: { icon: React.ElementType, count: number | null, message: string }) => {
    if (count === null) {
      return (
        <div className="flex items-center text-xs text-muted-foreground mr-3 last:mr-0">
          <Icon className="h-3.5 w-3.5 mr-1" />
          <Skeleton className="h-3 w-16 bg-muted/50" />
        </div>
      );
    }
    return (
      <div className="flex items-center text-xs text-muted-foreground mr-3 last:mr-0">
        <Icon className="h-3.5 w-3.5 mr-1" />
        {message}
      </div>
    );
  };
  
  const allStatsLoaded = viewCount !== null && favoriteCount !== null && activeListingsCount !== null;
  const noMeaningfulStats = allStatsLoaded && viewCount === 0 && favoriteCount === 0 && activeListingsCount === 0;

  if (noMeaningfulStats) {
      return null;
  }

  return (
    <div className="flex flex-wrap items-center mt-2 mb-3">
      {(viewCount !== null) && <StatItem icon={Eye} count={viewCount} message={t('viewsToday', {count: viewCount})} />}
      {(favoriteCount !== null) && <StatItem icon={Heart} count={favoriteCount} message={t('saves', {count: favoriteCount})} />}
      {(activeListingsCount !== null && sellerId) && (
        <StatItem icon={ListChecks} count={activeListingsCount} message={t('activeListings', {count: activeListingsCount})} />
      )}

      {(viewCount === null) && <StatItem icon={Eye} count={null} message="..." />}
      {(favoriteCount === null) && <StatItem icon={Heart} count={null} message="..." />}
      {(activeListingsCount === null && sellerId) && <StatItem icon={ListChecks} count={null} message="..." />}
    </div>
  );
}
