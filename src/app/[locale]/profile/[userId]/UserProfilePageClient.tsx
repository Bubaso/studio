

"use client";

import { useEffect, useState } from 'react';
import type { UserProfile, Item, UserStatus } from '@/lib/types';
import { getUserDocument, getSubscribersForUser, getSubscriptionsForUser, getUserStatuses } from '@/services/userService';
import { getUserListingsFromFirestore } from '@/services/itemService';
import { UserProfileCard } from '@/components/user-profile-card';
import { Loader2 } from 'lucide-react';
import { StatusDisplay } from '@/components/status-display';

interface UserProfilePageClientProps {
  userId: string;
}

export default function UserProfilePageClient({ userId }: UserProfilePageClientProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Item[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserProfile[]>([]);
  const [subscribers, setSubscribers] = useState<UserProfile[]>([]);
  const [statuses, setStatuses] = useState<UserStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfileData() {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all data in parallel
        const [user, userListings, userSubscriptions, userSubscribers, userStatuses] = await Promise.all([
          getUserDocument(userId),
          getUserListingsFromFirestore(userId),
          getSubscriptionsForUser(userId),
          getSubscribersForUser(userId),
          getUserStatuses(userId),
        ]);

        if (!user) {
          setError("Utilisateur non trouvé.");
        } else {
          setUserProfile(user);
          setListings(userListings);
          setSubscriptions(userSubscriptions);
          setSubscribers(userSubscribers);
          setStatuses(userStatuses);
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
    <div className="space-y-8">
      {statuses.length > 0 && (
        <div className="space-y-4">
          {statuses.map(status => (
            <StatusDisplay
              key={status.id}
              user={userProfile}
              status={status}
              // onStatusDeleted is not passed here as you can't delete other's statuses
            />
          ))}
        </div>
      )}
      <UserProfileCard
        user={userProfile}
        listings={listings}
        subscriptions={subscriptions}
        subscribers={subscribers}
      />
    </div>
  );
}
