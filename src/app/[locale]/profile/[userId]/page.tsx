
import UserProfilePageClient from './UserProfilePageClient';

interface UserProfilePageProps {
  params: { userId: string };
}

// This Server Component passes the userId to the Client Component,
// which will handle all the data fetching.
export default function UserProfilePage({ params }: UserProfilePageProps) {
  return <UserProfilePageClient userId={params.userId} />;
}
