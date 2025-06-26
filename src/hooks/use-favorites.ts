
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
    // Define an async function inside the effect
    const fetchFavorites = async () => {
      // Ensure we have a logged-in user before fetching
      if (!currentUser) {
        setFavoriteItems([]);
        setIsLoadingFavorites(false);
        return;
      }

      setIsLoadingFavorites(true);
      try {
        const items = await getUserFavoriteItems(currentUser.uid);
        setFavoriteItems(items);
      } catch (err) {
        console.error("Failed to fetch favorites in useFavorites hook:", err);
        setFavoriteItems([]); // Reset to empty on error
      } finally {
        setIsLoadingFavorites(false);
      }
    };

    // Call the async function only when auth is no longer loading
    if (!authLoading) {
      fetchFavorites();
    }
  }, [currentUser, authLoading]); // Effect dependencies are correct

  return { favoriteItems, isLoading: isLoadingFavorites };
}
