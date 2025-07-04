

import { db, storage, auth } from '@/lib/firebase'; // Added storage and auth
import type { UserProfile, ViewHistoryItem } from '@/lib/types';
import { doc, setDoc, getDoc, updateDoc, Timestamp, serverTimestamp, collection, query, orderBy, limit, getDocs, runTransaction } from 'firebase/firestore'; // Added updateDoc and runTransaction
import type { User as FirebaseUser } from 'firebase/auth';
import { updateProfile } from 'firebase/auth'; // For updating Firebase Auth profile
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

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


export const createUserDocument = async (firebaseUser: FirebaseUser, additionalData: Partial<UserProfile> = {}): Promise<void> => {
  if (!firebaseUser) return;

  const userRef = doc(db, 'users', firebaseUser.uid);
  const counterRef = doc(db, 'counters', 'userCounter');

  try {
    await runTransaction(db, async (transaction) => {
      const userSnapshot = await transaction.get(userRef);

      if (userSnapshot.exists()) {
        // User already exists, do nothing in this transaction.
        return;
      }

      // Get and increment the user counter
      const counterDoc = await transaction.get(counterRef);
      const currentCount = counterDoc.data()?.count || 0;
      const newCount = currentCount + 1;

      // Determine if the user is a founding member and set their free listings
      const isFoundingMember = newCount <= 100;
      const freeListings = isFoundingMember ? 15 : 5; // 10 bonus listings for first 100 users

      // Prepare new user data
      const { email, displayName, photoURL } = firebaseUser;
      
      // Determine the user's name with clear precedence
      let finalName: string;
      if (additionalData.name && additionalData.name.trim() !== '') {
        finalName = additionalData.name; // Highest priority: name passed from signup form
      } else if (displayName && displayName.trim() !== '') {
        finalName = displayName; // Second priority: name from OAuth provider
      } else if (email) {
        finalName = email.split('@')[0]; // Third priority: derive from email
      } else {
        finalName = 'Utilisateur Anonyme'; // Fallback
      }

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
        isFoundingMember: isFoundingMember,
      };

      // Set the new user document
      transaction.set(userRef, newUserDocData);
      
      // Update the counter using set with merge to create if it doesn't exist
      transaction.set(counterRef, { count: newCount }, { merge: true });
    });

  } catch (error) {
    console.error("Error creating user document with counter transaction: ", error);
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
  if (data.avatarUrl) {
    authProfileUpdate.photoURL = data.avatarUrl;
    firestoreUpdateData.avatarUrl = data.avatarUrl;
    firestoreUpdateData.dataAiHint = "profil personne";
  }

  try {
    if (Object.keys(authProfileUpdate).length > 0) {
      await updateProfile(auth.currentUser, authProfileUpdate);
    }

    if (Object.keys(firestoreUpdateData).length > 0) {
      await updateDoc(userDocRef, firestoreUpdateData);
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
    // Use updateDoc which fails if the document does not exist.
    // This prevents a race condition with createUserDocument.
    await updateDoc(userDocRef, {
      lastActiveAt: serverTimestamp(),
    });
  } catch (error: any) {
    // It's normal for this to fail if the user document hasn't been created yet
    // during the signup process. We can safely ignore the 'not-found' error.
    if (error.code === 'not-found') {
      // Silently ignore, as createUserDocument will handle creation.
      return;
    }
    // Log other types of errors.
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
      // Try to parse the error from the server, but handle cases where it's not valid JSON
      try {
        const data = await response.json();
        return { success: false, error: data.error || "Une erreur interne s'est produite lors de la suppression du compte." };
      } catch (jsonError) {
        // This happens if the server returns a non-JSON error page (e.g., HTML for a 500 error)
        return { success: false, error: "Erreur de communication avec le serveur. La réponse n'est pas valide." };
      }
    }
    
    return { success: true };

  } catch (networkError: any) {
    // This catches errors from fetch() itself, like network-down issues.
    console.error("Error calling delete user account API (network/fetch failed):", networkError);
    return { success: false, error: networkError.message };
  }
}
