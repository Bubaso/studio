import { useState, useEffect } from 'react';
import type { UserProfile, Item } from '@/lib/types';
import { getUserDocument } from '@/services/userService';
import { getUserListingsFromFirestore } from '@/services/itemService';

export function useUserProfile(userId: string | null) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUserData() {
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
    }

    fetchUserData();
  }, [userId]);

  return { userProfile, listings, isLoading };
}
