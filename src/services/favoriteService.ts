
import { db, auth } from '@/lib/firebase';
import type { Item } from '@/lib/types';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getItemByIdFromFirestore } from './itemService';


export interface UserFavorite {
  userId: string;
  itemId: string;
  createdAt: Timestamp;
}

// Helper to convert Firestore Timestamp to ISO string
const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
    try {
      return (timestamp as Timestamp).toDate().toISOString();
    } catch (e) {
      console.warn('Error converting timestamp toDate in favoriteService:', timestamp, e);
      return new Date().toISOString();
    }
  }
  console.warn('Invalid timestamp format encountered in favoriteService:', timestamp);
  return new Date().toISOString();
};


export async function addFavorite(userId: string, itemId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId || !itemId) {
    return { success: false, error: "L'identifiant de l'utilisateur et de l'article sont requis." };
  }
  try {
    const favoriteRef = doc(db, 'userFavorites', `${userId}_${itemId}`);
    await setDoc(favoriteRef, {
      userId,
      itemId,
      createdAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error adding favorite:', error);
    return { success: false, error: error.message || "Impossible d'ajouter aux favoris." };
  }
}

export async function removeFavorite(userId: string, itemId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId || !itemId) {
    return { success: false, error: "L'identifiant de l'utilisateur et de l'article sont requis." };
  }
  try {
    const favoriteRef = doc(db, 'userFavorites', `${userId}_${itemId}`);
    await deleteDoc(favoriteRef);
    return { success: true };
  } catch (error: any) {
    console.error('Error removing favorite:', error);
    return { success: false, error: error.message || "Impossible de supprimer des favoris." };
  }
}

export async function isFavorited(userId: string, itemId: string): Promise<boolean> {
  if (!userId || !itemId) return false;
  try {
    const favoriteRef = doc(db, 'userFavorites', `${userId}_${itemId}`);
    const docSnap = await getDoc(favoriteRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking if favorited:', error);
    return false;
  }
}

export async function getUserFavoriteItems(userId: string): Promise<Item[]> {
  if (!userId) return [];
  try {
    const favoritesCollectionRef = collection(db, 'userFavorites');
    
    // The query is simplified by removing `orderBy`. This avoids the need for a specific
    // composite index on (userId, createdAt) which might be missing and causing a
    // misleading permissions error.
    const q = query(
      favoritesCollectionRef,
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    
    // Use Promise.all for more efficient fetching of item details.
    const favoriteItemsPromises = querySnapshot.docs.map(docSnap => {
      const favData = docSnap.data() as UserFavorite;
      // This function already handles null/missing items gracefully.
      return getItemByIdFromFirestore(favData.itemId);
    });

    // Await all item fetches and filter out any that might have been deleted.
    const items = (await Promise.all(favoriteItemsPromises)).filter(item => item !== null) as Item[];
    
    // Sort here to maintain a consistent order, e.g., by posted date.
    // This is a good trade-off for avoiding complex index requirements.
    const sortedItems = items.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());

    return sortedItems;

  } catch (error) {
    // Log the full error to help debug if the problem persists.
    console.error('Error fetching user favorite items:', error);
    return [];
  }
}

// Removed getFavoriteCountForItem as its real-time logic moves to ItemStatsDisplay component
