
"use client";

import { useEffect, useState } from 'react';
import type { UserProfile, Item } from '@/lib/types';
import { getUserDocument, getSubscribersForUser, getSubscriptionsForUser } from '@/services/userService';
import { getUserListingsFromFirestore } from '@/services/itemService';
import { UserProfileCard } from '@/components/user-profile-card';
import { Loader2 } from 'lucide-react';

interface UserProfilePageClientProps {
  userId: string;
}

export default function UserProfilePageClient({ userId }: UserProfilePageClientProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Item[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserProfile[]>([]);
  const [subscribers, setSubscribers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfileData() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all data in parallel from the client
        const [user, userListings, userSubscriptions, userSubscribers] = await Promise.all([
          getUserDocument(userId),
          getUserListingsFromFirestore(userId),
          getSubscriptionsForUser(userId),
          getSubscribersForUser(userId),
        ]);

        if (!user) {
          setError("Utilisateur non trouvé.");
        } else {
          setUserProfile(user);
          setListings(userListings);
          setSubscriptions(userSubscriptions);
          setSubscribers(userSubscribers);
        }
      } catch (e: any) {
        console.error("Failed to fetch user profile data:", e);
        // Display the actual error for debugging, which in this case is likely "Missing or insufficient permissions"
        setError(e.message || "Erreur lors du chargement du profil.");
      } finally {
        setIsLoading(false);
      }
    }

    if (userId) {
      fetchProfileData();
    }
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !userProfile) {
    return <div className="text-center py-10">{error || "Utilisateur non trouvé."}</div>;
  }

  return (
    <UserProfileCard
      user={userProfile}
      listings={listings}
      subscriptions={subscriptions}
      subscribers={subscribers}
    />
  );
}
