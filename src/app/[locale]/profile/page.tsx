
import ProfilePageClient from './ProfilePageClient';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, unstable_setRequestLocale } from 'next-intl/server';
import { getAdminInstances } from '@/lib/firebaseAdmin';
import type { UserProfile, Item, UserStatus } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';

interface ProfilePageProps {
  params: { locale: string };
}

// Helper to convert Firestore Timestamp to ISO string safely
const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
    if (!timestamp) return new Date().toISOString(); 
    if (typeof timestamp === 'string') return timestamp; 
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    return new Date().toISOString(); 
};

// Data fetching function for the server component
async function getProfileData(uid: string) {
    const { db } = getAdminInstances();
    
    // Fetch all data in parallel
    const userDocRef = db.collection('users').doc(uid);
    const listingsQuery = db.collection('items').where('sellerId', '==', uid).orderBy('postedDate', 'desc').get();
    const subscriptionsQuery = db.collection(`users/${uid}/subscriptions`).get();
    const subscribersQuery = db.collection(`users/${uid}/subscribers`).get();
    const statusesQuery = db.collection(`users/${uid}/statuses`).orderBy('createdAt', 'desc').limit(10).get();

    const [userDocSnap, listingsSnap, subscriptionsSnap, subscribersSnap, statusesSnap] = await Promise.all([
        userDocRef.get(),
        listingsQuery,
        subscriptionsQuery,
        subscribersQuery,
        statusesQuery
    ]);
    
    // Process user profile
    const userProfile: UserProfile | null = userDocSnap.exists() ? {
        uid: userDocSnap.id,
        ...userDocSnap.data(),
        joinedDate: convertTimestampToISO(userDocSnap.data()?.joinedDate),
        lastActiveAt: userDocSnap.data()?.lastActiveAt ? convertTimestampToISO(userDocSnap.data()?.lastActiveAt) : undefined,
    } as UserProfile : null;

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

async function getUserIdFromSessionCookie() {
    const { auth } = getAdminInstances();
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) {
        return null;
    }
    try {
        const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
        return decodedToken.uid;
    } catch (error) {
        console.warn("Could not verify session cookie:", error);
        return null;
    }
}


export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params: { locale } }: ProfilePageProps) {
  unstable_setRequestLocale(locale);
  const messages = await getMessages();
  const userId = await getUserIdFromSessionCookie();

  let profileData = null;
  if (userId) {
    profileData = await getProfileData(userId);
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ProfilePageClient
        initialData={profileData ? JSON.parse(JSON.stringify(profileData)) : null}
      />
    </NextIntlClientProvider>
  );
}
