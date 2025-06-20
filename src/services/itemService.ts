
'use server'; // Ensure this file's functions run as server actions

import { db, storage } from '@/lib/firebase'; 
import type { Item, ItemCategory, ItemCondition } from '@/lib/types';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit, QueryConstraint, updateDoc, serverTimestamp, addDoc, Timestamp as FirestoreTimestamp } from 'firebase/firestore';
import type { Timestamp as FirebaseTimestampType } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

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
  let imageUrls: string[] = ['https://placehold.co/600x400.png'];

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
  // This logic marks items older than 45 days with a price not divisible by 7 as having "low activity".
  const isOld = ageInDays > 45;
  // This is a placeholder for a real score. In reality, you'd check a stored `engagementScore` field.
  const hasSimulatedLowScore = data.price % 7 !== 0; 
  const lowActivity = isOld && hasSimulatedLowScore;

  return {
    id: document.id,
    name: itemName,
    description: data.description || '',
    price: data.price || 0,
    category: itemCategory,
    location: data.location || '',
    imageUrls: imageUrls,
    sellerId: data.sellerId || 'unknown',
    sellerName: data.sellerName || 'Vendeur inconnu',
    postedDate: convertTimestampToISO(data.postedDate as FirebaseTimestampType),
    condition: data.condition,
    dataAiHint: data.dataAiHint || `${categoryForHint} ${itemNameForHint}`.toLowerCase().replace(/[^a-z0-9\s]/gi, '').substring(0,20),
    lastUpdated: data.lastUpdated ? convertTimestampToISO(data.lastUpdated as FirebaseTimestampType) : undefined,
    suspectedSold: data.suspectedSold || false,
    lowActivity: lowActivity,
  };
};

export const getItemsFromFirestore = async (filters?: {
  category?: ItemCategory;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  query?: string;
  condition?: ItemCondition;
  count?: number;
  excludeSellerId?: string; 
}): Promise<Item[]> => {
  try {
    const itemsCollectionRef = collection(db, 'items');
    const queryConstraints: QueryConstraint[] = [];

    if (filters?.category) {
      queryConstraints.push(where('category', '==', filters.category));
    }
    if (filters?.condition) {
      queryConstraints.push(where('condition', '==', filters.condition));
    }
    if (filters?.priceMin !== undefined) {
      queryConstraints.push(where('price', '>=', filters.priceMin));
    }
    if (filters?.priceMax !== undefined) {
      queryConstraints.push(where('price', '<=', filters.priceMax));
    }
    
    queryConstraints.push(orderBy('postedDate', 'desc'));

    if (filters?.count && !filters.excludeSellerId) { 
      queryConstraints.push(limit(filters.count));
    } else if (filters?.count && filters.excludeSellerId) {
      queryConstraints.push(limit(filters.count * 2)); 
    }


    const q = query(itemsCollectionRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    let fetchedItems = querySnapshot.docs.map(mapDocToItem);

    if (filters?.location) {
      fetchedItems = fetchedItems.filter(item => item.location?.toLowerCase().includes(filters.location!.toLowerCase()));
    }
    if (filters?.query) {
      const lq = filters.query.toLowerCase();
      fetchedItems = fetchedItems.filter(item =>
        item.name.toLowerCase().includes(lq) ||
        item.description.toLowerCase().includes(lq) ||
        item.category.toLowerCase().includes(lq)
      );
    }
    
    // Sort items to push low-activity items to the bottom, effectively lowering their priority.
    fetchedItems.sort((a, b) => {
        const aScore = a.lowActivity ? 1 : 0;
        const bScore = b.lowActivity ? 1 : 0;
        return aScore - bScore;
    });

    if (filters?.excludeSellerId) {
      fetchedItems = fetchedItems.filter(item => item.sellerId !== filters.excludeSellerId);
    }

    if (filters?.count && filters.excludeSellerId) { 
        fetchedItems = fetchedItems.slice(0, filters.count);
    }


    return fetchedItems;
  } catch (error) {
    console.error("Error fetching items from Firestore: ", error);
    return [];
  }
};

export const getItemByIdFromFirestore = async (id: string): Promise<Item | null> => {
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

export const uploadImageAndGetURL = async (imageFile: File, userId: string): Promise<string> => {
  console.log(`ITEM_SERVICE_UPLOAD: Initiating uploadImageAndGetURL for item. UserID param: ${userId}, File: ${imageFile.name}, Size: ${imageFile.size}`);
  if (!userId) {
     const errorMsg = "ITEM_SERVICE_UPLOAD_ERROR: User ID (param) is required for image upload.";
     console.error(errorMsg);
     throw new Error(errorMsg);
  }
  if (!storage) {
    const errorMsg = "ITEM_SERVICE_UPLOAD_ERROR: Firebase Storage service is not initialized.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const uniqueFileName = `${Date.now()}_${imageFile.name}`;
  const imagePath = `items/${userId}/${uniqueFileName}`;
  console.log(`ITEM_SERVICE_UPLOAD: Constructed storage path: ${imagePath}`);
  const imageRef = storageRef(storage, imagePath);
  try {
    console.log(`ITEM_SERVICE_UPLOAD: Attempting uploadBytes for ${imagePath}.`);
    const snapshot = await uploadBytes(imageRef, imageFile);
    console.log(`ITEM_SERVICE_UPLOAD: Upload successful for ${imagePath}. Snapshot ref: ${snapshot.ref.fullPath}`);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`ITEM_SERVICE_UPLOAD: Got download URL for ${imagePath}: ${downloadURL}`);
    return downloadURL;
  } catch (error: any) {
    console.error(`ITEM_SERVICE_UPLOAD_ERROR: Firebase Storage operation failed for path ${imagePath}.`);
    console.error(`ITEM_SERVICE_UPLOAD_ERROR_RAW: Name: ${error.name}, Code: ${error.code}, Message: ${error.message}`);
    console.error("ITEM_SERVICE_UPLOAD_ERROR_FULL_OBJECT:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2)); // Added 2 for pretty print
    throw error;
  }
};

export async function createItemInFirestore(
  itemData: Omit<Item, 'id' | 'postedDate' | 'lastUpdated'>
): Promise<string> {
  console.log(`ITEM_SERVICE_CREATE: itemData.sellerId passed to createItemInFirestore: ${itemData.sellerId}`);

  try {
    const docRef = await addDoc(collection(db, "items"), {
      ...itemData,
      postedDate: serverTimestamp(),
    });
    console.log("SERVER: Item created successfully in Firestore with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("SERVER: Error creating item in Firestore: ", error);
    throw error; 
  }
}

export async function updateItemInFirestore(
  itemId: string,
  itemData: Partial<Omit<Item, 'id' | 'postedDate' | 'sellerId' | 'sellerName' | 'lastUpdated'>>
): Promise<void> {
  if (!itemId) {
    throw new Error("Item ID is required for updating.");
  }
  const itemRef = doc(db, 'items', itemId);

  const dataToUpdate: any = { ...itemData };

  if (dataToUpdate.price !== undefined) {
    dataToUpdate.price = Number(dataToUpdate.price);
  }
  dataToUpdate.lastUpdated = serverTimestamp();

  try {
    await updateDoc(itemRef, dataToUpdate);
    console.log(`SERVER: Item ${itemId} updated successfully in Firestore.`);
  } catch (error) {
    console.error(`SERVER: Error updating item ${itemId} in Firestore: `, error);
    throw error;
  }
}

export async function logItemView(itemId: string): Promise<void> {
  if (!itemId) {
    console.warn('SERVER: logItemView called without itemId');
    return;
  }
  try {
    const viewsCollectionRef = collection(db, 'items', itemId, 'views');
    await addDoc(viewsCollectionRef, {
      timestamp: serverTimestamp(),
    });
    console.log(`SERVER: View logged successfully for item ${itemId} in Firestore.`);
  } catch (error) {
    console.error(`SERVER: Error logging view for item ${itemId}:`, error);
  }
}
