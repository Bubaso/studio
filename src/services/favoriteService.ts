
'use server';

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
  onSnapshot, // Added for real-time count
  Unsubscribe, // Added for real-time count
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
    const q = query(
      favoritesCollectionRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const favoriteItems: Item[] = [];
    for (const docSnap of querySnapshot.docs) {
      const favData = docSnap.data() as UserFavorite;
      const item = await getItemByIdFromFirestore(favData.itemId);
      if (item) {
        favoriteItems.push(item);
      }
    }
    return favoriteItems;
  } catch (error) {
    console.error('Error fetching user favorite items:', error);
    return [];
  }
}

export async function getFavoriteCountForItem(itemId: string, onUpdate: (count: number) => void): Promise<Unsubscribe> {
  if (!itemId) {
    console.warn('getFavoriteCountForItem called without itemId.');
    onUpdate(0);
    return Promise.resolve(() => {}); // No-op unsubscribe, wrapped in Promise
  }
  const favoritesQuery = query(collection(db, 'userFavorites'), where('itemId', '==', itemId));

  const unsubscribe = onSnapshot(
    favoritesQuery,
    (snapshot) => {
      onUpdate(snapshot.size);
    },
    (error) => {
      console.error(`Error fetching favorite count for item ${itemId}:`, error);
      onUpdate(0);
    }
  );
  return Promise.resolve(unsubscribe); // Return the unsubscribe function wrapped in a Promise
}
