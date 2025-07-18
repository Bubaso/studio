

import { db, storage, auth } from '@/lib/firebase'; // Added storage and auth
import type { UserProfile, ViewHistoryItem, UserStory, Item, UserStatus } from '@/lib/types';
import { doc, setDoc, getDoc, updateDoc, Timestamp, serverTimestamp, collection, query, orderBy, limit, getDocs, runTransaction, increment, deleteField, addDoc, deleteDoc, where } from 'firebase/firestore'; // Removed onSnapshot, Unsubscribe
import type { User as FirebaseUser } from 'firebase/auth';
import { updateProfile } from 'firebase/auth'; // For updating Firebase Auth profile
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { sendWelcomeEmail } from './emailService';
import { getItemByIdFromFirestore } from './itemService';

// Helper to convert Firestore Timestamp to ISO string
const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
  if (!timestamp) return new Date().toISOString(); // Default for missing
  if (typeof timestamp === 'string') return timestamp; // Already a string
  // Check if it's a Firestore Timestamp-like object with a toDate method
  if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
    try {
      return (timestamp as Timestamp).toDate().toISOString();
    } catch (e) {
      console.warn("Error converting timestamp toDate in userService:", e, timestamp);
      return new Date().toISOString(); // Fallback on conversion error
    }
  }
  // If it's not a string, not undefined, and not a valid Timestamp, it's malformed.
  console.warn('Invalid timestamp format encountered in userService:', timestamp);
  return new Date().toISOString(); // Fallback for malformed
};

const mapDocToProfile = (docSnap: import('firebase/firestore').DocumentSnapshot): UserProfile | null => {
    if (!docSnap.exists()) {
        console.log(`No such user document with UID: ${docSnap.id}`);
        return null;
    }
    const data = docSnap.data();
    const joinedDateISO = convertTimestampToISO(data.joinedDate);
    const lastActiveAtISO = data.lastActiveAt ? convertTimestampToISO(data.lastActiveAt) : undefined;
    return {
        uid: docSnap.id,
        email: data.email || null,
        name: data.name || null,
        avatarUrl: data.avatarUrl || null,
        dataAiHint: data.dataAiHint || "profil personne",
        joinedDate: joinedDateISO,
        location: data.location || '',
        lastActiveAt: lastActiveAtISO,
        credits: data.credits ?? 0,
        freeListingsRemaining: data.freeListingsRemaining ?? 0,
        subscriberCount: data.subscriberCount || 0,
        subscriptionCount: data.subscriptionCount || 0,
        isFoundingMember: data.isFoundingMember || false,
    } as UserProfile;
}


export const createUserDocument = async (firebaseUser: FirebaseUser, additionalData: Partial<UserProfile> = {}, locale: string): Promise<void> => {
  if (!db) {
      console.error("Firestore (db) is not initialized. Cannot create user document.");
      throw new Error("Database service is not available.");
  }
  if (!firebaseUser) throw new Error("Firebase user object is required.");

  const userRef = doc(db, 'users', firebaseUser.uid);
  
  // The user does not exist, so we proceed with creation.
  const counterRef = doc(db, '_counters', 'users');

  try {
    await runTransaction(db, async (transaction) => {
        const userInTransaction = await transaction.get(userRef);
        if (userInTransaction.exists()) {
            console.log(`User document for ${firebaseUser.uid} already exists. Skipping creation within transaction.`);
            return; 
        }

        const counterSnap = await transaction.get(counterRef);
        const userCount = counterSnap.exists() ? counterSnap.data().count : 0;

        let isFoundingMember = userCount < 100;
        let freeListings = isFoundingMember ? 15 : 5;

        const { email, displayName, photoURL } = firebaseUser;
        const finalName = additionalData.name || displayName || email?.split('@')[0] || 'Utilisateur Anonyme';
        const finalAvatarUrl = additionalData.avatarUrl || photoURL || `https://placehold.co/100x100.png?text=${finalName.substring(0,2).toUpperCase()}`;

        const newUserDocData = {
          email,
          name: finalName,
          avatarUrl: finalAvatarUrl,
          dataAiHint: "profil personne",
          joinedDate: serverTimestamp(),
          location: additionalData.location || '',
          lastActiveAt: serverTimestamp(),
          credits: 0,
          freeListingsRemaining: freeListings,
          subscriberCount: 0,
          subscriptionCount: 0,
          isFoundingMember: isFoundingMember,
        };
        
        transaction.set(userRef, newUserDocData);

        if (counterSnap.exists()) {
            transaction.update(counterRef, { count: increment(1) });
        } else {
            transaction.set(counterRef, { count: 1 });
        }
    });

    // Sync the profile information back to Firebase Auth after the transaction
    if (auth.currentUser) {
        const finalName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Utilisateur Anonyme';
        const finalAvatarUrl = firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${finalName.substring(0,2).toUpperCase()}`;
        if (finalName !== auth.currentUser.displayName || finalAvatarUrl !== auth.currentUser.photoURL) {
            await updateProfile(auth.currentUser, { 
                displayName: finalName,
                photoURL: finalAvatarUrl
            }).catch(e => console.warn("Could not sync Auth profile on user creation:", e));
        }
    }

    console.log(`Transaction successfully committed for creating user ${firebaseUser.uid}.`);
    
    if (firebaseUser.email) {
        sendWelcomeEmail({ to: firebaseUser.email, name: firebaseUser.displayName || firebaseUser.email.split('@')[0], locale });
    }

  } catch (error) {
    console.error("Error in createUserDocument transaction: ", error);
    throw error;
  }
};

export const getUserDocument = async (uid: string): Promise<UserProfile | null> => {
  if (!uid || typeof uid !== 'string' || uid.length === 0 || uid.includes('/')) {
    console.warn(`Attempted to fetch user document with invalid UID: ${uid}`);
    return null;
  }
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    return mapDocToProfile(userDocSnap);
  } catch (error) {
    console.error(`Error fetching user document for UID ${uid}: `, error);
    return null;
  }
};

export const uploadAvatarAndGetURL = async (imageFile: File, userId: string): Promise<string> => {
  if (!userId) {
     console.error("User ID is required for avatar upload.");
     throw new Error("User ID is required for avatar upload.");
  }
  const uniqueFileName = `avatar_${Date.now()}_${imageFile.name}`;
  const imageRef = storageRef(storage, `avatars/${userId}/${uniqueFileName}`);
  try {
    const snapshot = await uploadBytes(imageRef, imageFile);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading avatar: ", error);
    throw error;
  }
};

export const updateUserProfile = async (
  uid: string,
  data: {
    name?: string;
    location?: string;
    avatarUrl?: string;
  }
): Promise<void> => {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    console.error("User not authenticated or UID mismatch for profile update.");
    throw new Error("User not authenticated or UID mismatch.");
  }

  const userDocRef = doc(db, "users", uid);
  const authProfileUpdate: { displayName?: string; photoURL?: string } = {};
  const firestoreUpdateData: Partial<UserProfile> = {};

  if (data.name !== undefined) { // Check for undefined to allow setting empty string if intended
    authProfileUpdate.displayName = data.name;
    firestoreUpdateData.name = data.name;
  }
  if (data.location !== undefined) {
    firestoreUpdateData.location = data.location;
  }
  if (data.avatarUrl !== undefined) {
    authProfileUpdate.photoURL = data.avatarUrl;
    firestoreUpdateData.avatarUrl = data.avatarUrl;
    if (data.avatarUrl) {
      firestoreUpdateData.dataAiHint = "profil personne";
    }
  }


  try {
    if (Object.keys(authProfileUpdate).length > 0) {
      await updateProfile(auth.currentUser, authProfileUpdate);
    }

    if (Object.keys(firestoreUpdateData).length > 0) {
      await updateDoc(userDocRef, firestoreUpdateData as { [x: string]: any });
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

export const updateUserLastActive = async (uid: string): Promise<void> => {
  if (!uid) {
    console.warn('updateUserLastActive called without a uid.');
    return;
  }
  const userDocRef = doc(db, 'users', uid);
  try {
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        await updateDoc(userDocRef, {
            lastActiveAt: serverTimestamp(),
        });
    }
  } catch (error: any) {
    console.error(`Error updating lastActiveAt for user ${uid}:`, error);
  }
};

export async function getUserViewHistory(userId: string, count: number = 10): Promise<ViewHistoryItem[]> {
  if (!userId) return [];
  try {
    const historyCollectionRef = collection(db, 'users', userId, 'viewHistory');
    const q = query(historyCollectionRef, orderBy('viewedAt', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            itemId: data.itemId,
            name: data.name,
            category: data.category,
            price: data.price,
            description: data.description,
            viewedAt: convertTimestampToISO(data.viewedAt),
        } as ViewHistoryItem;
    });
  } catch (error) {
    console.error(`Error fetching view history for user ${userId}:`, error);
    return [];
  }
}

export async function deleteUserAccount(): Promise<{ success: boolean; error?: string }> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, error: "Vous devez être connecté pour supprimer votre compte." };
  }

  try {
    const idToken = await user.getIdToken(true);
    const response = await fetch('/api/user/delete', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      try {
        const data = await response.json();
        return { success: false, error: data.error || "Une erreur interne s'est produite lors de la suppression du compte." };
      } catch (jsonError) {
        return { success: false, error: "Erreur de communication avec le serveur. La réponse n'est pas valide." };
      }
    }
    
    return { success: true };

  } catch (networkError: any) {
    console.error("Error calling delete user account API (network/fetch failed):", networkError);
    return { success: false, error: networkError.message };
  }
}

export async function getSubscriptionsForUser(userId: string): Promise<UserProfile[]> {
  if (!db || !userId) return [];
  try {
    const subscriptionsRef = collection(db, 'users', userId, 'subscriptions');
    const q = query(subscriptionsRef, orderBy('subscribedAt', 'desc'), limit(100)); // Limit to 100 for now
    const snapshot = await getDocs(q);
    const userIds = snapshot.docs.map(doc => doc.id);
    const userProfiles = await Promise.all(userIds.map(id => getUserDocument(id)));
    return userProfiles.filter((p): p is UserProfile => p !== null);
  } catch (error) {
    console.error(`Error fetching subscriptions for user ${userId}:`, error);
    return [];
  }
}

export async function getSubscribersForUser(userId: string): Promise<UserProfile[]> {
  if (!db || !userId) return [];
  try {
    const subscribersRef = collection(db, 'users', userId, 'subscribers');
    const q = query(subscribersRef, orderBy('subscribedAt', 'desc'), limit(100)); // Limit to 100
    const snapshot = await getDocs(q);
    const userIds = snapshot.docs.map(doc => doc.id);
    const userProfiles = await Promise.all(userIds.map(id => getUserDocument(id)));
    return userProfiles.filter((p): p is UserProfile => p !== null);
  } catch (error) {
    console.error(`Error fetching subscribers for user ${userId}:`, error);
    return [];
  }
}

export async function addUserStatus(uid: string, text: string, itemId: string | null): Promise<{ success: boolean; error?: string }> {
  if (!uid) {
    return { success: false, error: "User not authenticated." };
  }
  if (!text.trim()) {
    return { success: false, error: "Status text cannot be empty." };
  }
  const statusesRef = collection(db, 'users', uid, 'statuses');
  const statusData: { text: string; createdAt: any; updatedAt: any; itemId?: string, itemPreview?: any } = {
    text: text,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    itemPreview: null,
  };

  if (itemId && itemId !== "none") {
    const item = await getItemByIdFromFirestore(itemId);
    if (!item || item.sellerId !== uid) {
      return { success: false, error: "You can only feature your own items in your status." };
    }
    statusData.itemId = itemId;

    if (item.imageUrls && item.imageUrls.length > 0 && item.imageUrls[0]) {
      statusData.itemPreview = { 
        id: item.id,
        name: item.name,
        price: item.price,
        imageUrl: item.imageUrls[0],
      };
    } else {
      statusData.itemPreview = null;
    }
  } else {
     statusData.itemPreview = deleteField();
  }

  try {
    await addDoc(statusesRef, statusData);
    return { success: true };
  } catch (error: any) {
    console.error("Error adding user status:", error);
    return { success: false, error: "Could not add status." };
  }
}

export async function deleteUserStatus(uid: string, statusId: string): Promise<{ success: boolean; error?: string }> {
    if (!uid || !statusId) {
        return { success: false, error: "User ID and Status ID are required." };
    }
    const statusRef = doc(db, 'users', uid, 'statuses', statusId);
    try {
        await deleteDoc(statusRef);
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting user status:", error);
        return { success: false, error: "Could not delete status." };
    }
}

export async function getUserStatuses(userId: string): Promise<UserStatus[]> {
  if (!userId) return [];
  try {
    const statusesRef = collection(db, 'users', userId, 'statuses');
    const q = query(statusesRef, orderBy('createdAt', 'desc'), limit(10)); // Limit to latest 10 statuses for profile
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        text: data.text,
        itemId: data.itemId,
        createdAt: convertTimestampToISO(data.createdAt as Timestamp),
        updatedAt: convertTimestampToISO(data.updatedAt as Timestamp),
        itemPreview: data.itemPreview || null,
      } as UserStatus;
    });
  } catch (error) {
    console.error("Error fetching user statuses:", error);
    return [];
  }
}

export async function getFollowingStatusFeed(userId: string): Promise<UserStory[]> {
  if (!userId) return [];
  try {
    const subscriptions = await getSubscriptionsForUser(userId);
    if (subscriptions.length === 0) return [];

    const userStoryPromises = subscriptions.map(async (user) => {
      const statusesRef = collection(db, 'users', user.uid, 'statuses');
      const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
      const q = query(
        statusesRef, 
        where('updatedAt', '>=', twentyFourHoursAgo),
        orderBy('updatedAt', 'desc'), 
        limit(5)
      );
      const statusSnapshot = await getDocs(q);

      if (statusSnapshot.empty) {
        return null;
      }
      
      const statuses = statusSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            text: data.text,
            itemId: data.itemId,
            createdAt: convertTimestampToISO(data.createdAt as Timestamp),
            updatedAt: convertTimestampToISO(data.updatedAt as Timestamp),
            itemPreview: data.itemPreview || null,
        } as UserStatus;
      }).reverse(); // Reverse to show oldest first in the story sequence

      return {
        user: {
          uid: user.uid,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        stories: statuses,
      } as UserStory;
    });

    const feedItemsUnfiltered = await Promise.all(userStoryPromises);
    const feedItems = feedItemsUnfiltered.filter((item): item is UserStory => item !== null && item.stories.length > 0);

    // Sort users by the latest status update time, newest first
    const sortedFeed = feedItems.sort((a, b) => {
       const lastUpdateA = new Date(a.stories[a.stories.length - 1].updatedAt).getTime();
       const lastUpdateB = new Date(b.stories[b.stories.length - 1].updatedAt).getTime();
       return lastUpdateB - lastUpdateA;
    });

    return sortedFeed;
  } catch (error: any) {
    // Check if the error is a Firestore index error
    if (error.code === 'failed-precondition') {
      console.warn(
        "Firestore index missing for `getFollowingStatusFeed`. " +
        "This query requires a composite index on `statuses` collection: `updatedAt` ascending and `createdAt` descending. " +
        "Firestore should prompt to create it in the console error logs. Query will fail until the index is built. " +
        "Original Error:", error.message
      );
    } else {
       console.error(`Error fetching status feed for user ${userId}:`, error);
    }
    return [];
  }
}
