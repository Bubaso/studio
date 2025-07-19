
import { useState, useEffect, useCallback } from 'react';
import type { UserProfile, Item } from '@/lib/types';
import { getUserDocument } from '@/services/userService';
import { getUserListingsFromFirestore } from '@/services/itemService';

// This hook is now deprecated in favor of server-side data fetching on the profile page.
// It is kept here in case it is needed for other client-side profile fetching scenarios.
export function useUserProfile(userId: string | null) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setUserProfile(null);
      setListings([]);
      return;
    }

    setIsLoading(true);
    try {
      const profile = await getUserDocument(userId);
      setUserProfile(profile);

      if (profile) {
        const userListings = await getUserListingsFromFirestore(profile.uid);
        setListings(userListings);
      } else {
        setListings([]);
      }
    } catch (error) {
      console.error("Error fetching user profile data:", error);
      setUserProfile(null);
      setListings([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  return { userProfile, listings, isLoading, refetch: fetchUserData };
}
