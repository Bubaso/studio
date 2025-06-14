
"use client";

import { useEffect, useState } from 'react';
import { Eye, Heart, ListChecks } from 'lucide-react';
import { getTodaysItemViewCount, getUserListingsFromFirestore } from '@/services/itemService';
import { getFavoriteCountForItem } from '@/services/favoriteService';
import type { Item } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import type { Unsubscribe } from 'firebase/firestore';

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
      unsubscribeViews = getTodaysItemViewCount(itemId, setViewCount);
    }
    return () => unsubscribeViews();
  }, [itemId]);

  useEffect(() => {
    let unsubscribeFavorites: Unsubscribe = () => {};
    if (itemId) {
      const setupListener = async () => {
        // Now awaiting the async function
        unsubscribeFavorites = await getFavoriteCountForItem(itemId, setFavoriteCount);
      };
      setupListener();
    }
    // The cleanup function for unsubscribeFavorites will be returned by this effect
    return () => {
      if (unsubscribeFavorites && typeof unsubscribeFavorites === 'function') {
        unsubscribeFavorites();
      }
    };
  }, [itemId]);

  useEffect(() => {
    if (sellerId) {
      getUserListingsFromFirestore(sellerId)
        .then(listings => setActiveListingsCount(listings.length))
        .catch(err => {
          console.error("Failed to fetch seller's active listings:", err);
          setActiveListingsCount(0); // Set to 0 or null on error
        });
    }
  }, [sellerId]);

  const StatItem = ({ icon: Icon, count, text, loadingText }: { icon: React.ElementType, count: number | null, text: string, loadingText: string }) => {
    if (count === null) {
      return (
        <div className="flex items-center text-xs text-muted-foreground mr-3 last:mr-0">
          <Icon className="h-3.5 w-3.5 mr-1" />
          <Skeleton className="h-3 w-16 bg-muted/50" />
        </div>
      );
    }
    if (count === 0 && (text.includes("vu") || text.includes("sauvegardé"))) return null; // Hide if 0 for views/saves

    return (
      <div className="flex items-center text-xs text-muted-foreground mr-3 last:mr-0">
        <Icon className="h-3.5 w-3.5 mr-1" />
        {count} {text}
      </div>
    );
  };
  
  // Do not render the container if all stats are effectively null or zero for view/save
  const shouldRenderContainer = viewCount !== null || favoriteCount !== null || activeListingsCount !== null;
  if (!shouldRenderContainer && (viewCount === 0 || viewCount === null) && (favoriteCount === 0 || favoriteCount === null)) {
      if (activeListingsCount === null || activeListingsCount === 0) return null;
  }


  return (
    <div className="flex flex-wrap items-center mt-2 mb-3">
      <StatItem icon={Eye} count={viewCount} text="personnes ont vu cet article aujourd'hui" loadingText="Chargement des vues..." />
      <StatItem icon={Heart} count={favoriteCount} text="personnes ont sauvegardé cet article" loadingText="Chargement des favoris..." />
      {sellerId && ( // Only show seller listings if sellerId is available
        <StatItem icon={ListChecks} count={activeListingsCount} text={`annonce(s) active(s) par ce vendeur`} loadingText="Chargement des annonces du vendeur..." />
      )}
    </div>
  );
}
