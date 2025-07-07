





import { db, storage, auth } from '@/lib/firebase'; // Added storage and auth
import type { UserProfile, ViewHistoryItem, StatusFeedItem, Item, UserStatus } from '@/lib/types';
import { doc, setDoc, getDoc, updateDoc, Timestamp, serverTimestamp, collection, query, orderBy, limit, getDocs, runTransaction, increment, deleteField, addDoc, deleteDoc } from 'firebase/firestore'; // Added updateDoc and runTransaction
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
      console.warn('Error converting timestamp toDate:', timestamp, e);
      return new Date().toISOString(); // Fallback on conversion error
    }
  }
  // If it's not a string, not undefined, and not a valid Timestamp, it's malformed.
  console.warn('Invalid timestamp format encountered in userService:', timestamp);
  return new Date().toISOString(); // Fallback for malformed
};


export const createUserDocument = async (firebaseUser: FirebaseUser, additionalData: Partial<UserProfile> = {}, locale: string): Promise<void> => {
  if (!db) {
      console.error("Firestore (db) is not initialized. Cannot create user document.");
      throw new Error("Database service is not available.");
  }
  if (!firebaseUser) throw new Error("Firebase user object is required.");

  const userRef = doc(db, 'users', firebaseUser.uid);

  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) {
    console.log(`User document for ${firebaseUser.uid} already exists. Skipping creation.`);
    return;
  }

  try {
    const { email, displayName, photoURL } = firebaseUser;

    let finalName: string;
    if (additionalData.name && additionalData.name.trim() !== '') {
      finalName = additionalData.name;
    } else if (displayName && displayName.trim() !== '') {
      finalName = displayName;
    } else if (email) {
      finalName = email.split('@')[0];
    } else {
      finalName = 'Utilisateur Anonyme';
    }
    
    const freeListings = 5;

    const newUserDocData = {
      email,
      name: finalName,
      avatarUrl: photoURL || additionalData.avatarUrl || `https://placehold.co/100x100.png?text=${finalName.substring(0,2).toUpperCase()}`,
      dataAiHint: additionalData.dataAiHint || "profil personne",
      joinedDate: serverTimestamp(),
      location: additionalData.location || '',
      lastActiveAt: serverTimestamp(),
      credits: 0,
      freeListingsRemaining: freeListings,
      subscriberCount: 0,
      subscriptionCount: 0,
      isFoundingMember: false,
    };

    await setDoc(userRef, newUserDocData);
    console.log(`Successfully created user document for ${firebaseUser.uid}`);

    if (finalName && email) {
      // Asynchronously send the welcome email. We don't await it here,
      // as the user's creation process should not block on email sending.
      // Errors are handled and logged within the sendWelcomeEmail service itself.
      sendWelcomeEmail({ to: email, name: finalName, locale: locale });
    }

  } catch (error) {
    console.error("Error creating user document: ", error);
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

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      // Ensure joinedDate is correctly converted, handling potential string format from older data
      const joinedDateISO = convertTimestampToISO(data.joinedDate);
      const lastActiveAtISO = data.lastActiveAt ? convertTimestampToISO(data.lastActiveAt) : undefined;

      return {
        uid: userDocSnap.id,
        email: data.email || null,
        name: data.name || null,
        avatarUrl: data.avatarUrl || null,
        dataAiHint: data.dataAiHint || "profil personne", // Provide a default if missing
        joinedDate: joinedDateISO,
        location: data.location || '', // Provide a default if missing
        lastActiveAt: lastActiveAtISO,
        credits: data.credits ?? 0,
        freeListingsRemaining: data.freeListingsRemaining ?? 0,
        subscriberCount: data.subscriberCount || 0,
        subscriptionCount: data.subscriptionCount || 0,
        isFoundingMember: data.isFoundingMember || false, // Add new field
      } as UserProfile;
    } else {
      console.log(`No such user document with UID: ${uid}`);
      return null;
    }
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
  const statusData: { text: string; createdAt: any; itemId?: string } = {
    text: text,
    createdAt: serverTimestamp(),
  };

  if (itemId && itemId !== "none") {
    const itemRef = doc(db, 'items', itemId);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists() || itemSnap.data().sellerId !== uid) {
      return { success: false, error: "You can only feature your own items in your status." };
    }
    statusData.itemId = itemId;
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
      } as UserStatus;
    });
  } catch (error) {
    console.error("Error fetching user statuses:", error);
    return [];
  }
}

export async function getFollowingStatusFeed(userId: string): Promise<StatusFeedItem[]> {
  if (!userId) return [];
  try {
    const subscriptions = await getSubscriptionsForUser(userId);
    if (subscriptions.length === 0) return [];

    const statusPromises = subscriptions.map(async (user) => {
      const statusesRef = collection(db, 'users', user.uid, 'statuses');
      const q = query(statusesRef, orderBy('createdAt', 'desc'), limit(1));
      const statusSnapshot = await getDocs(q);

      if (statusSnapshot.empty) {
        return null;
      }

      const statusDoc = statusSnapshot.docs[0];
      const statusData = statusDoc.data();
      const status: UserStatus = {
        id: statusDoc.id,
        text: statusData.text,
        itemId: statusData.itemId,
        createdAt: convertTimestampToISO(statusData.createdAt),
      };

      let itemData: Item | null = null;
      if (status.itemId) {
        itemData = await getItemByIdFromFirestore(status.itemId);
      }
      return {
        status: status,
        user: {
          uid: user.uid,
          name: user.name,
          avatarUrl: user.avatarUrl,
        },
        item: itemData ? {
          id: itemData.id,
          name: itemData.name,
          price: itemData.price,
          imageUrls: itemData.imageUrls,
        } : null,
      } as StatusFeedItem;
    });

    const feedItemsUnfiltered = await Promise.all(statusPromises);
    const feedItems = feedItemsUnfiltered.filter((item): item is StatusFeedItem => item !== null);

    // Sort by status creation time, newest first
    const sortedFeed = feedItems.sort((a, b) =>
      new Date(b.status.createdAt).getTime() - new Date(a.status.createdAt).getTime()
    );

    return sortedFeed;
  } catch (error) {
    console.error(`Error fetching status feed for user ${userId}:`, error);
    return [];
  }
}
