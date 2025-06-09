
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

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
        joinedDate, // Store as ISO string, or use serverTimestamp() for Firestore native timestamp
        location: additionalData.location || '',
        // Initialize other fields as needed
        ...additionalData, // Allows overriding name, avatarUrl, etc. from signup form if provided
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
      // Ensure joinedDate is a string
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
