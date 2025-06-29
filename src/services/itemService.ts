
import { db, storage, auth } from '@/lib/firebase';
import type { Item, ItemCategory, ItemCondition } from '@/lib/types';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit, QueryConstraint, updateDoc, serverTimestamp, addDoc, deleteDoc, Timestamp as FirestoreTimestamp, deleteField, startAfter, writeBatch, increment } from 'firebase/firestore';
import type { Timestamp as FirebaseTimestampType } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { LISTING_COST_IN_CREDITS } from '@/lib/config';
import { deleteReportsForItem } from './reportService';

// Helper to convert Firestore Timestamp to ISO string
const convertTimestampToISO = (timestamp: FirebaseTimestampType | undefined | string): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  if (timestamp && typeof (timestamp as FirebaseTimestampType).toDate === 'function') {
    try {
      return (timestamp as FirebaseTimestampType).toDate().toISOString();
    } catch (e) {
      console.warn('Error converting timestamp toDate:', timestamp, e);
      return new Date().toISOString();
    }
  }
  console.warn('Invalid timestamp format encountered:', timestamp);
  return new Date().toISOString();
};

const mapDocToItem = (document: any): Item => {
  const data = document.data();
  let imageUrls: string[] = [];

  if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
    imageUrls = data.imageUrls;
  } else if (typeof data.imageUrl === 'string') {
    imageUrls = [data.imageUrl];
  }

  const itemName = typeof data.name === 'string' ? data.name : '';
  const itemCategory = typeof data.category === 'string' ? data.category : 'Autre';
  
  const itemNameForHint = itemName ? itemName.split(' ')[0] : 'article';
  const categoryForHint = itemCategory || 'general';
  
  const postDate = new Date(convertTimestampToISO(data.postedDate as FirebaseTimestampType));
  const now = new Date();
  const ageInDays = (now.getTime() - postDate.getTime()) / (1000 * 3600 * 24);

  // SIMULATION: In a real app, engagementScore would be calculated and stored by a background job (e.g., Cloud Function).
  // Here, we simulate it to demonstrate the "low activity" feature.
  const isOld = ageInDays > 45;
  const hasSimulatedLowScore = data.price % 7 !== 0; 
  const lowActivity = isOld && hasSimulatedLowScore;

  return {
    id: document.id,
    name: itemName,
    description: data.description || '',
    price: data.price || 0,
    category: itemCategory,
    location: data.location || '',
    latitude: data.latitude,
    longitude: data.longitude,
    imageUrls: imageUrls,
    videoUrl: data.videoUrl || undefined,
    sellerId: data.sellerId || 'unknown',
    sellerName: data.sellerName || 'Vendeur inconnu',
    postedDate: convertTimestampToISO(data.postedDate as FirebaseTimestampType),
    condition: data.condition,
    dataAiHint: data.dataAiHint || `${categoryForHint} ${itemNameForHint}`.toLowerCase().replace(/[^a-z0-9\\s]/gi, '').substring(0,20),
    lastUpdated: data.lastUpdated ? convertTimestampToISO(data.lastUpdated as FirebaseTimestampType) : undefined,
    suspectedSold: data.suspectedSold || false,
    lowActivity: lowActivity,
    isSold: data.isSold || false,
    soldAt: data.soldAt ? convertTimestampToISO(data.soldAt as FirebaseTimestampType) : undefined,
    phoneNumber: data.phoneNumber || undefined,
    deliveryOptions: data.deliveryOptions || [],
  };
};

export const getItemsFromFirestore = async (filters?: {
  categories?: string[]; // Changed to support multiple categories
  priceMin?: number;
  priceMax?: number;
  location?: string;
  query?: string;
  condition?: ItemCondition;
  pageSize?: number;
  lastVisibleItemId?: string;
}): Promise<{ items: Item[]; lastItemId: string | null; hasMore: boolean; }> => {
  if (!db) {
    console.error("Firestore (db) is not initialized. Check your Firebase configuration in .env");
    return { items: [], lastItemId: null, hasMore: false };
  }
  try {
    const itemsCollectionRef = collection(db, 'items');
    const queryConstraints: QueryConstraint[] = [];

    // --- Server-side Filters ---
    if (filters?.categories && filters.categories.length > 0) {
      queryConstraints.push(where('category', 'in', filters.categories));
    }
    if (filters?.condition) {
      queryConstraints.push(where('condition', '==', filters.condition));
    }
    
    // --- Sorting & Price Filtering ---
    if (filters?.priceMin !== undefined && filters?.priceMax !== undefined) {
        queryConstraints.push(where('price', '>=', filters.priceMin));
        queryConstraints.push(where('price', '<=', filters.priceMax));
        queryConstraints.push(orderBy('price', 'asc'));
    } else {
        queryConstraints.push(orderBy('postedDate', 'desc')); // Default sort
    }

    // --- Pagination ---
    if (filters?.lastVisibleItemId) {
      const lastVisibleDoc = await getDoc(doc(db, 'items', filters.lastVisibleItemId));
      if (lastVisibleDoc.exists()) {
        queryConstraints.push(startAfter(lastVisibleDoc));
      } else {
        console.warn(`Pagination cursor error: Item with ID ${filters.lastVisibleItemId} not found.`);
      }
    }
    
    const pageSize = filters?.pageSize || 50;
    queryConstraints.push(limit(pageSize + 1)); // Fetch one extra to check for "hasMore"

    // Execute the query
    const q = query(itemsCollectionRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);

    const hasMore = querySnapshot.docs.length > pageSize;
    const pageDocs = querySnapshot.docs.slice(0, pageSize);
    
    let items = pageDocs.map(mapDocToItem);

    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    items = items.filter(item => {
        if (!item.isSold) return true;
        if (item.soldAt && new Date(item.soldAt) > fifteenDaysAgo) return true;
        return false;
    });

    const lastVisibleDocInSet = pageDocs[pageDocs.length - 1];
    const lastItemId = lastVisibleDocInSet ? lastVisibleDocInSet.id : null;

    return { items, lastItemId, hasMore };

  } catch (error) {
    console.error("Error fetching items from Firestore: ", error);
    return { items: [], lastItemId: null, hasMore: false };
  }
};


export const getItemByIdFromFirestore = async (id: string): Promise<Item | null> => {
  if (!db) {
    console.error("Firestore (db) is not initialized. Check your Firebase configuration in .env");
    return null;
  }
  if (!id || typeof id !== 'string' || id.length === 0 || id.includes('/')) {
    console.warn(`Attempted to fetch item with invalid ID: ${id}`);
    return null;
  }
  try {
    const itemDocRef = doc(db, 'items', id);
    const docSnap = await getDoc(itemDocRef);

    if (docSnap.exists()) {
      return mapDocToItem(docSnap);
    } else {
      console.log(`No such item document with ID: ${id}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching item by ID ${id} from Firestore: `, error);
    return null;
  }
};

export const getUserListingsFromFirestore = async (userId: string): Promise<Item[]> => {
  if (!db) {
    console.error("Firestore (db) is not initialized. Check your Firebase configuration in .env");
    return [];
  }
  if (!userId) {
    console.warn("Attempted to fetch user listings with no userId.");
    return [];
  }
  try {
    const itemsCollectionRef = collection(db, 'items');
    const q = query(itemsCollectionRef, where('sellerId', '==', userId), orderBy('postedDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocToItem);
  } catch (error) {
    console.error(`Error fetching user listings for ${userId} from Firestore: `, error);
    return [];
  }
};

export const uploadImageAndGetURL = (
    imageFile: File,
    userId: string,
    onProgress: (progress: number) => void
): Promise<string> => {
    if (!storage) {
        const errorMsg = "ITEM_SERVICE_UPLOAD_ERROR: Firebase Storage service is not initialized. Check your Firebase configuration in .env";
        console.error(errorMsg);
        return Promise.reject(new Error(errorMsg));
    }
    if (!userId) {
        const errorMsg = "ITEM_SERVICE_UPLOAD_ERROR: User ID is required for image upload.";
        console.error(errorMsg);
        return Promise.reject(new Error(errorMsg));
    }
    
    const uniqueFileName = `${Date.now()}_${imageFile.name}`;
    const imagePath = `itemImages/${userId}/${uniqueFileName}`;
    const imageRef = storageRef(storage, imagePath);
    const uploadTask = uploadBytesResumable(imageRef, imageFile);

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress(progress);
            },
            (error) => {
                console.error(`ITEM_SERVICE_UPLOAD_ERROR: Firebase Storage operation failed for path ${imagePath}.`);
                console.error("ITEM_SERVICE_UPLOAD_ERROR_FULL_OBJECT:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
};

export const uploadVideoAndGetURL = (
    videoFile: File,
    userId: string,
    onProgress: (progress: number) => void
): Promise<string> => {
    if (!storage) {
        const errorMsg = "ITEM_SERVICE_UPLOAD_ERROR: Firebase Storage service is not initialized. Check your Firebase configuration in .env";
        console.error(errorMsg);
        return Promise.reject(new Error(errorMsg));
    }
    if (!userId) {
        const errorMsg = "ITEM_SERVICE_UPLOAD_ERROR: User ID is required for video upload.";
        console.error(errorMsg);
        return Promise.reject(new Error(errorMsg));
    }

    const uniqueFileName = `${Date.now()}_${videoFile.name}`;
    const videoPath = `itemVideos/${userId}/${uniqueFileName}`;
    const videoRef = storageRef(storage, videoPath);
    const uploadTask = uploadBytesResumable(videoRef, videoFile);

    return new Promise((resolve, reject) => {
        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                onProgress(progress);
            },
            (error) => {
                console.error(`ITEM_SERVICE_UPLOAD_ERROR: Firebase Storage operation failed for path ${videoPath}.`);
                console.error("ITEM_SERVICE_UPLOAD_ERROR_FULL_OBJECT:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
                reject(error);
            },
            async () => {
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (error) {
                    reject(error);
                }
            }
        );
    });
};


export async function createItemInFirestore(
  itemData: Omit<Item, 'id' | 'postedDate' | 'lastUpdated'>
): Promise<string> {
  if (!db) {
    throw new Error("Firestore (db) is not initialized.");
  }
  const userId = itemData.sellerId;
  if (!userId) {
    throw new Error("Seller ID is missing from item data.");
  }

  // Check for duplicate items
  const q = query(
    collection(db, 'items'),
    where('sellerId', '==', userId),
    where('name', '==', itemData.name),
    where('price', '==', itemData.price),
    where('description', '==', itemData.description),
    where('isSold', '==', false) // Only check against unsold items
  );

  const duplicatesSnapshot = await getDocs(q);
  if (!duplicatesSnapshot.empty) {
    throw new Error("Une annonce identique existe déjà.");
  }

  const batch = writeBatch(db);
  const userRef = doc(db, 'users', userId);

  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      throw new Error("User profile not found.");
    }
    const userProfile = userSnap.data();
    const hasFreeListings = (userProfile.freeListingsRemaining || 0) > 0;
    const hasEnoughCredits = (userProfile.credits || 0) >= LISTING_COST_IN_CREDITS;

    if (hasFreeListings) {
      batch.update(userRef, { freeListingsRemaining: increment(-1) });
    } else if (hasEnoughCredits) {
      batch.update(userRef, { credits: increment(-LISTING_COST_IN_CREDITS) });
    } else {
      throw new Error("Fonds insuffisants pour publier l'annonce.");
    }

    const dataToSend: any = { ...itemData };
    if (dataToSend.videoUrl === undefined) delete dataToSend.videoUrl;
    if (dataToSend.latitude === undefined) delete dataToSend.latitude;
    if (dataToSend.longitude === undefined) delete dataToSend.longitude;
    if (dataToSend.phoneNumber === undefined) delete dataToSend.phoneNumber;
    if (dataToSend.deliveryOptions === undefined) delete dataToSend.deliveryOptions;

    const newItemRef = doc(collection(db, "items"));
    batch.set(newItemRef, {
      ...dataToSend,
      postedDate: serverTimestamp(),
      isSold: false, // Ensure new items are marked as not sold
    });

    await batch.commit();
    return newItemRef.id;

  } catch (error) {
    console.error("SERVER: Error creating item in Firestore within transaction: ", error);
    throw error; 
  }
}

export async function updateItemInFirestore(
  itemId: string,
  itemData: Partial<Omit<Item, 'id' | 'postedDate' | 'sellerId' | 'sellerName' | 'lastUpdated'>>
): Promise<void> {
  if (!db) {
    console.error("Firestore (db) is not initialized. Check your Firebase configuration in .env");
    throw new Error("Firestore (db) is not initialized.");
  }
  if (!itemId) {
    throw new Error("Item ID is required for updating.");
  }
  const itemRef = doc(db, 'items', itemId);

  const dataToUpdate: any = { ...itemData };

  if (dataToUpdate.price !== undefined) {
    dataToUpdate.price = Number(dataToUpdate.price);
  }
  
  if ('videoUrl' in dataToUpdate && dataToUpdate.videoUrl === undefined) {
      dataToUpdate.videoUrl = deleteField();
  }
  if ('phoneNumber' in dataToUpdate && dataToUpdate.phoneNumber === undefined) {
    dataToUpdate.phoneNumber = deleteField();
  }
  if ('latitude' in dataToUpdate && dataToUpdate.latitude === undefined) {
    dataToUpdate.latitude = deleteField();
  }
  if ('longitude' in dataToUpdate && dataToUpdate.longitude === undefined) {
    dataToUpdate.longitude = deleteField();
  }
  if ('deliveryOptions' in dataToUpdate && dataToUpdate.deliveryOptions === undefined) {
    dataToUpdate.deliveryOptions = deleteField();
  }
  
  dataToUpdate.lastUpdated = serverTimestamp();

  try {
    await updateDoc(itemRef, dataToUpdate);
  } catch (error) {
    console.error(`SERVER: Error updating item ${itemId} in Firestore: `, error);
    throw error;
  }
}

export async function logItemView(itemId: string, userId: string, item: Partial<Item>): Promise<void> {
  if (!db) {
    console.error("Firestore (db) is not initialized. Check your Firebase configuration in .env");
    return;
  }
  if (!itemId || !userId) {
    console.warn('logItemView requires itemId and userId');
    return;
  }
  try {
    const batch = writeBatch(db);

    const itemViewsRef = doc(collection(db, 'items', itemId, 'views'));
    batch.set(itemViewsRef, {
      timestamp: serverTimestamp(),
      userId: userId,
    });

    const userHistoryRef = doc(collection(db, 'users', userId, 'viewHistory'));
    batch.set(userHistoryRef, {
        itemId: item.id,
        name: item.name,
        category: item.category,
        price: item.price,
        description: item.description,
        viewedAt: serverTimestamp(),
    });

    await batch.commit();

  } catch (error) {
    console.error(`SERVER: Error logging view for item ${itemId} by user ${userId}:`, error);
  }
}


export async function markItemAsSold(itemId: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore (db) is not initialized.");
  }
  const itemRef = doc(db, 'items', itemId);
  await updateDoc(itemRef, {
    isSold: true,
    soldAt: serverTimestamp(),
    suspectedSold: deleteField(),
  });
}

export async function rejectSuspectedSold(itemId: string): Promise<void> {
  if (!db) {
    throw new Error("Firestore (db) is not initialized.");
  }
  
  // First, clear all existing reports for this item to reset the count
  await deleteReportsForItem(itemId);
  
  // Then, remove the suspectedSold flag from the item
  const itemRef = doc(db, 'items', itemId);
  await updateDoc(itemRef, {
    suspectedSold: deleteField(),
  });
}

export async function deleteItem(itemId: string): Promise<void> {
  if (!db || !storage) {
    console.error("Firestore (db) or Storage is not initialized. Check your Firebase configuration in .env");
    throw new Error("Firestore (db) or Storage is not initialized.");
  }
  const item = await getItemByIdFromFirestore(itemId);
  if (!item) {
    throw new Error("Item not found, cannot delete.");
  }

  const imageDeletePromises = item.imageUrls.map(url => {
    if (url.includes('firebasestorage.googleapis.com')) {
      try {
        const imageRef = storageRef(storage, url);
        return deleteObject(imageRef);
      } catch (error) {
        console.error(`Failed to create storage reference for URL ${url}. It might be malformed.`, error);
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  });

  if (item.videoUrl && item.videoUrl.includes('firebasestorage.googleapis.com')) {
    try {
        const videoRef = storageRef(storage, item.videoUrl);
        imageDeletePromises.push(deleteObject(videoRef));
    } catch (error) {
        console.error(`Failed to create storage reference for video URL ${item.videoUrl}.`, error);
    }
  }


  await Promise.allSettled(imageDeletePromises)
    .then(results => {
      results.forEach(result => {
        if (result.status === 'rejected') {
          console.warn('One or more media files failed to delete:', result.reason);
        }
      });
    });

  const itemDocRef = doc(db, 'items', itemId);
  await deleteDoc(itemDocRef);
}
