

"use client";

import type { UserProfile, Item, UserStatus } from '@/lib/types';
import { UserProfileCard } from '@/components/user-profile-card';
import { StatusDisplay } from '@/components/status-display';

interface UserProfilePageClientProps {
  initialData: {
    userProfile: UserProfile;
    listings: Item[];
    subscriptions: UserProfile[];
    subscribers: UserProfile[];
    statuses: UserStatus[];
  };
}

// This is now a "dumb" client component that just receives props and renders the UI.
// All data fetching has been moved to the parent server component.
export default function UserProfilePageClient({ initialData }: UserProfilePageClientProps) {
  const { userProfile, listings, subscriptions, subscribers, statuses } = initialData;

  return (
    <div className="space-y-8">
      {statuses.length > 0 && (
        <div className="space-y-4">
          {statuses.map(status => (
            <StatusDisplay
              key={status.id}
              user={userProfile}
              status={status}
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
