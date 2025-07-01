import { getUserDocument } from '@/services/userService';
import { getUserListingsFromFirestore } from '@/services/itemService';
import { UserProfileCard } from '@/components/user-profile-card';

interface UserProfilePageProps {
  params: { userId: string };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const user = await getUserDocument(params.userId);

  if (!user) {
    return <div className="text-center py-10">Utilisateur non trouvé. Vérifiez que l'UID est correct et que l'utilisateur existe dans Firestore.</div>;
  }

  const listings = await getUserListingsFromFirestore(user.uid);

  return <UserProfileCard user={user} listings={listings} />;
}
