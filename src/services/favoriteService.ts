
import { db } from '@/lib/firebase';
import type { Item, UserCollection, CollectionItem } from '@/lib/types';
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
  writeBatch,
  increment,
  arrayUnion,
  arrayRemove,
  addDoc,
  runTransaction
} from 'firebase/firestore';
import { getItemByIdFromFirestore } from './itemService';

const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
    return (timestamp as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
};


export async function getCollectionsForUser(userId: string): Promise<UserCollection[]> {
  if (!userId) return [];
  try {
    const collectionsRef = collection(db, 'collections');
    const q = query(collectionsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        name: data.name,
        createdAt: convertTimestampToISO(data.createdAt as Timestamp),
        itemCount: data.itemCount || 0,
        previewImageUrls: data.previewImageUrls || [],
      } as UserCollection;
    });
  } catch (error) {
    console.error("Error fetching user collections:", error);
    return [];
  }
}

export async function getCollectionWithItems(collectionId: string): Promise<{ collection: UserCollection; items: Item[] } | null> {
    if (!collectionId) return null;

    const collectionRef = doc(db, 'collections', collectionId);
    const itemsRef = collection(collectionRef, 'items');

    try {
        const [collectionSnap, itemsSnap] = await Promise.all([
            getDoc(collectionRef),
            getDocs(query(itemsRef, orderBy('addedAt', 'desc')))
        ]);

        if (!collectionSnap.exists()) {
            return null;
        }

        const collectionData = collectionSnap.data();
        const collectionResult: UserCollection = {
            id: collectionSnap.id,
            userId: collectionData.userId,
            name: collectionData.name,
            createdAt: convertTimestampToISO(collectionData.createdAt as Timestamp),
            itemCount: collectionData.itemCount || 0,
            previewImageUrls: collectionData.previewImageUrls || [],
        };

        const itemIds = itemsSnap.docs.map(doc => doc.id);
        const itemPromises = itemIds.map(id => getItemByIdFromFirestore(id));
        const items = (await Promise.all(itemPromises)).filter((item): item is Item => item !== null);

        return { collection: collectionResult, items };
    } catch (error) {
        console.error(`Error fetching collection ${collectionId} with items:`, error);
        return null;
    }
}


export async function createCollectionAndAddItem(userId: string, collectionName: string, itemId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId || !collectionName.trim() || !itemId) {
    return { success: false, error: "User ID, collection name, and item ID are required." };
  }
  try {
    const item = await getItemByIdFromFirestore(itemId);
    if (!item) {
        return { success: false, error: "Item to add not found." };
    }
    
    const collectionsRef = collection(db, 'collections');
    const newCollectionRef = doc(collectionsRef);

    const batch = writeBatch(db);

    batch.set(newCollectionRef, {
      userId,
      name: collectionName.trim(),
      createdAt: serverTimestamp(),
      itemCount: 1,
      previewImageUrls: item.imageUrls.slice(0, 4)
    });

    const newItemRef = doc(newCollectionRef, 'items', itemId);
    batch.set(newItemRef, { addedAt: serverTimestamp() });

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error('Error creating collection and adding item:', error);
    return { success: false, error: error.message || "Could not create collection." };
  }
}

export async function toggleItemInCollection(userId: string, collectionId: string, itemId: string, isInCollection: boolean): Promise<{ success: boolean; error?: string }> {
    if (!userId || !collectionId || !itemId) {
        return { success: false, error: "User ID, collection ID, and item ID are required." };
    }
    const collectionRef = doc(db, 'collections', collectionId);
    const itemRef = doc(collectionRef, 'items', itemId);

    try {
        await runTransaction(db, async (transaction) => {
            const collectionSnap = await transaction.get(collectionRef);
            if (!collectionSnap.exists() || collectionSnap.data().userId !== userId) {
                throw new Error("Collection not found or access denied.");
            }
            
            if (isInCollection) { // REMOVE
                transaction.delete(itemRef);
                transaction.update(collectionRef, {
                    itemCount: increment(-1),
                    // Note: Removing from previewImageUrls is complex.
                    // For simplicity, we'll only decrement the count.
                    // A background function would be better for maintaining previews.
                });
            } else { // ADD
                const itemData = await getItemByIdFromFirestore(itemId);
                if (!itemData) throw new Error("Item to add does not exist.");

                transaction.set(itemRef, { addedAt: serverTimestamp() });
                const updatePayload: any = { itemCount: increment(1) };

                const currentPreviews = collectionSnap.data().previewImageUrls || [];
                if (currentPreviews.length < 4 && itemData.imageUrls.length > 0) {
                    updatePayload.previewImageUrls = arrayUnion(itemData.imageUrls[0]);
                }
                transaction.update(collectionRef, updatePayload);
            }
        });
        return { success: true };
    } catch (error: any) {
        console.error('Error toggling item in collection:', error);
        return { success: false, error: error.message || "Could not update collection." };
    }
}

export async function getCollectionsForItem(userId: string, itemId: string): Promise<UserCollection[]> {
    if (!userId || !itemId) return [];
    try {
        const userCollections = await getCollectionsForUser(userId);
        const collectionsWithItemPromises = userCollections.map(async (collection) => {
            const itemRef = doc(db, 'collections', collection.id, 'items', itemId);
            const itemSnap = await getDoc(itemRef);
            return itemSnap.exists() ? collection : null;
        });

        const collectionsWithItem = (await Promise.all(collectionsWithItemPromises)).filter(c => c !== null);
        return collectionsWithItem as UserCollection[];
    } catch (error) {
        console.error('Error getting collections for item:', error);
        return [];
    }
}

export async function deleteCollection(collectionId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    if (!collectionId || !userId) {
        return { success: false, error: "Collection ID and User ID are required." };
    }
    try {
        // This is a simplified deletion. For large collections, a Cloud Function is recommended.
        const collectionRef = doc(db, 'collections', collectionId);
        const collectionSnap = await getDoc(collectionRef);
        if (!collectionSnap.exists() || collectionSnap.data()?.userId !== userId) {
            return { success: false, error: "Collection not found or you don't have permission to delete it." };
        }

        // Delete the main collection document
        await deleteDoc(collectionRef);
        
        // Note: This does not delete the subcollection items. A Cloud Function is
        // the recommended way to handle cascading deletes in production.
        return { success: true };
    } catch (error: any) {
        console.error("Error deleting collection:", error);
        return { success: false, error: error.message || "Could not delete collection." };
    }
}
