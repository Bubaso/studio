
import { db, storage, auth } from '@/lib/firebase'; // Added storage and auth
import type { UserProfile } from '@/lib/types';
import { doc, setDoc, getDoc, updateDoc, Timestamp } from 'firebase/firestore'; // Added updateDoc
import type { User as FirebaseUser } from 'firebase/auth';
import { updateProfile } from 'firebase/auth'; // For updating Firebase Auth profile
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

// Helper to convert Firestore Timestamp to ISO string
const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
  if (!timestamp) return new Date().toISOString(); // Default to now if undefined
  if (typeof timestamp === 'string') return timestamp; // Already a string
  return timestamp.toDate().toISOString();
};


export const createUserDocument = async (firebaseUser: FirebaseUser, additionalData: Partial<UserProfile> = {}): Promise<void> => {
  if (!firebaseUser) return;

  const userRef = doc(db, 'users', firebaseUser.uid);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    const { email, displayName, photoURL } = firebaseUser;
    const joinedDate = new Date().toISOString();

    try {
      await setDoc(userRef, {
        uid: firebaseUser.uid,
        email,
        name: displayName || additionalData.name || email?.split('@')[0] || 'Utilisateur Anonyme',
        avatarUrl: photoURL || additionalData.avatarUrl || `https://placehold.co/100x100.png?text=${(displayName || email || 'UA').substring(0,2).toUpperCase()}`,
        dataAiHint: additionalData.dataAiHint || "profil personne",
        joinedDate,
        location: additionalData.location || '',
      });
    } catch (error) {
      console.error("Error creating user document: ", error);
      throw error;
    }
  }
};

export const getUserDocument = async (uid: string): Promise<UserProfile | null> => {
  if (!uid) return null;
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      const joinedDateISO = data.joinedDate instanceof Timestamp
                            ? data.joinedDate.toDate().toISOString()
                            : (typeof data.joinedDate === 'string' ? data.joinedDate : new Date().toISOString());

      return {
        uid: data.uid,
        email: data.email || null,
        name: data.name || null,
        avatarUrl: data.avatarUrl || null,
        dataAiHint: data.dataAiHint,
        joinedDate: joinedDateISO,
        location: data.location,
      } as UserProfile;
    } else {
      console.log("No such user document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user document: ", error);
    return null;
  }
};

export const uploadAvatarAndGetURL = async (imageFile: File, userId: string): Promise<string> => {
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
    avatarUrl?: string; // This will be the new URL if an avatar was uploaded
  }
): Promise<void> => {
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    throw new Error("User not authenticated or UID mismatch.");
  }

  const userDocRef = doc(db, "users", uid);
  const authProfileUpdate: { displayName?: string; photoURL?: string } = {};
  const firestoreUpdateData: Partial<UserProfile> = {};

  if (data.name) {
    authProfileUpdate.displayName = data.name;
    firestoreUpdateData.name = data.name;
  }
  if (data.location !== undefined) { // Allow clearing location
    firestoreUpdateData.location = data.location;
  }
  if (data.avatarUrl) {
    authProfileUpdate.photoURL = data.avatarUrl;
    firestoreUpdateData.avatarUrl = data.avatarUrl;
    firestoreUpdateData.dataAiHint = "profil personne"; // Generic hint for uploaded avatars
  }

  try {
    // Update Firebase Auth profile
    if (Object.keys(authProfileUpdate).length > 0) {
      await updateProfile(auth.currentUser, authProfileUpdate);
    }

    // Update Firestore document
    if (Object.keys(firestoreUpdateData).length > 0) {
      await updateDoc(userDocRef, firestoreUpdateData);
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};
