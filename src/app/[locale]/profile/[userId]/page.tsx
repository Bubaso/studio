

import { getUserDocument, getSubscriptionsForUser, getSubscribersForUser } from '@/services/userService';
import { getUserListingsFromFirestore } from '@/services/itemService';
import { UserProfileCard } from '@/components/user-profile-card';
import type { UserProfile } from '@/lib/types';

interface UserProfilePageProps {
  params: { userId: string };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  // Fetch all data in parallel
  const [user, listings, subscriptions, subscribers] = await Promise.all([
    getUserDocument(params.userId),
    getUserListingsFromFirestore(params.userId),
    getSubscriptionsForUser(params.userId),
    getSubscribersForUser(params.userId),
  ]);

  if (!user) {
    return <div className="text-center py-10">Utilisateur non trouvé. Vérifiez que l'UID est correct et que l'utilisateur existe dans Firestore.</div>;
  }

  return <UserProfileCard user={user} listings={listings} subscriptions={subscriptions} subscribers={subscribers} />;
}
