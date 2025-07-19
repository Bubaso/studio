
import UserProfilePageClient from './UserProfilePageClient';
import { getAdminInstances } from '@/lib/firebaseAdmin';
import type { UserProfile, Item, UserStatus } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

// This is now a Server Component responsible for fetching all data for a specific user profile.

// Helper to convert Firestore Timestamp to ISO string safely
const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
    if (!timestamp) return new Date().toISOString();
    if (typeof timestamp === 'string') return timestamp;
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    return new Date().toISOString();
};

async function getPublicProfileData(userId: string) {
    const { db } = getAdminInstances();
    
    // Fetch all data in parallel
    const userDocRef = db.collection('users').doc(userId);
    const listingsQuery = db.collection('items').where('sellerId', '==', userId).orderBy('postedDate', 'desc').get();
    const subscriptionsQuery = db.collection(`users/${userId}/subscriptions`).get();
    const subscribersQuery = db.collection(`users/${userId}/subscribers`).get();
    const statusesQuery = db.collection(`users/${userId}/statuses`).orderBy('createdAt', 'desc').limit(10).get();

    const [userDocSnap, listingsSnap, subscriptionsSnap, subscribersSnap, statusesSnap] = await Promise.all([
        userDocRef.get(),
        listingsQuery,
        subscriptionsQuery,
        subscribersQuery,
        statusesQuery
    ]);

    // Process user profile
    if (!userDocSnap.exists) {
        return null; // User not found
    }
    const userProfileData = userDocSnap.data();
    const userProfile: UserProfile = {
        uid: userDocSnap.id,
        ...userProfileData,
        joinedDate: convertTimestampToISO(userProfileData?.joinedDate),
        lastActiveAt: userProfileData?.lastActiveAt ? convertTimestampToISO(userProfileData?.lastActiveAt) : undefined,
    } as UserProfile;

    // Process listings
    const listings: Item[] = listingsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        postedDate: convertTimestampToISO(doc.data()?.postedDate),
    } as Item));
    
    // Process subscriptions and subscribers
    const subscriptionIds = subscriptionsSnap.docs.map(doc => doc.id);
    const subscriberIds = subscribersSnap.docs.map(doc => doc.id);

    const [subscriptionProfiles, subscriberProfiles] = await Promise.all([
        Promise.all(subscriptionIds.map(id => db.collection('users').doc(id).get())),
        Promise.all(subscriberIds.map(id => db.collection('users').doc(id).get()))
    ]);

    const subscriptions = subscriptionProfiles
        .filter(doc => doc.exists)
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

    const subscribers = subscriberProfiles
        .filter(doc => doc.exists)
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        
    // Process statuses
    const statuses: UserStatus[] = statusesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: convertTimestampToISO(doc.data().createdAt),
        updatedAt: convertTimestampToISO(doc.data().updatedAt),
    } as UserStatus));

    return { userProfile, listings, subscriptions, subscribers, statuses };
}

interface UserProfilePageProps {
  params: { userId: string };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const profileData = await getPublicProfileData(params.userId);

  if (!profileData) {
      return <div className="text-center py-10">Utilisateur non trouvé.</div>;
  }

  // Pass the server-fetched data to the client component
  // Use JSON.parse(JSON.stringify(...)) to ensure plain objects are passed
  return <UserProfilePageClient initialData={JSON.parse(JSON.stringify(profileData))} />;
}
