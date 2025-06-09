
import { db, storage, auth } from '@/lib/firebase'; // Added storage and auth
import type { UserProfile } from '@/lib/types';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'; // Added updateDoc
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
  
  try {
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      const { email, displayName, photoURL } = firebaseUser;
      const joinedDate = new Date().toISOString();
      const userName = displayName || additionalData.name || email?.split('@')[0] || 'Utilisateur Anonyme';

      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email,
        name: userName,
        avatarUrl: photoURL || additionalData.avatarUrl || `https://placehold.co/100x100.png?text=${userName.substring(0,2).toUpperCase()}`,
        dataAiHint: additionalData.dataAiHint || "profil personne",
        joinedDate,
        location: additionalData.location || '',
      });
    }
  } catch (error) {
    console.error("Error creating or checking user document: ", error);
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
      const joinedDateISO = data.joinedDate instanceof Timestamp
                            ? data.joinedDate.toDate().toISOString()
                            : (typeof data.joinedDate === 'string' ? data.joinedDate : new Date().toISOString());

      return {
        uid: data.uid,
        email: data.email || null,
        name: data.name || null,
        avatarUrl: data.avatarUrl || null,
        dataAiHint: data.dataAiHint || "profil personne", // Provide a default if missing
        joinedDate: joinedDateISO,
        location: data.location || '', // Provide a default if missing
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
