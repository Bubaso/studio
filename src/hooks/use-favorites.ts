
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Item } from '@/lib/types';
import { getUserFavoriteItems } from '@/services/favoriteService';

export function useFavorites() {
  const { firebaseUser: currentUser, authLoading } = useAuth();
  const [favoriteItems, setFavoriteItems] = useState<Item[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

  useEffect(() => {
    // We should only start fetching once the initial auth check is done.
    if (authLoading) {
      return;
    }
    
    if (currentUser) {
      setIsLoadingFavorites(true);
      getUserFavoriteItems(currentUser.uid)
        .then(setFavoriteItems)
        .catch(err => {
          console.error("Failed to fetch favorites in useFavorites hook:", err);
          setFavoriteItems([]); // Set to empty on error
        })
        .finally(() => setIsLoadingFavorites(false));
    } else {
      // If there's no user, clear items and stop loading.
      setFavoriteItems([]);
      setIsLoadingFavorites(false);
    }
  }, [currentUser, authLoading]);

  return { favoriteItems, isLoading: isLoadingFavorites };
}
