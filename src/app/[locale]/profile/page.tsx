
import ProfilePageClient from './ProfilePageClient';

export const dynamic = 'force-dynamic';

// This is now a Server Component that ensures the route is handled dynamically.
export default function ProfilePage() {
  // We can add server-side logic here in the future if needed.
  return <ProfilePageClient />;
}
