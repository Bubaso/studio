import { db, storage } from '@/lib/firebase'; 
import type { Item, ItemCategory, ItemCondition } from '@/lib/types';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit, QueryConstraint, updateDoc, serverTimestamp, addDoc, deleteDoc, Timestamp as FirestoreTimestamp, deleteField } from 'firebase/firestore';
import type { Timestamp as FirebaseTimestampType } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

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
    imageUrls: imageUrls,
    videoUrl: data.videoUrl || undefined,
    sellerId: data.sellerId || 'unknown',
    sellerName: data.sellerName || 'Vendeur inconnu',
    postedDate: convertTimestampToISO(data.postedDate as FirebaseTimestampType),
    condition: data.condition,
    dataAiHint: data.dataAiHint || `${categoryForHint} ${itemNameForHint}`.toLowerCase().replace(/[^a-z0-9\s]/gi, '').substring(0,20),
    lastUpdated: data.lastUpdated ? convertTimestampToISO(data.lastUpdated as FirebaseTimestampType) : undefined,
    suspectedSold: data.suspectedSold || false,
    lowActivity: lowActivity,
    isSold: data.isSold || false,
    soldAt: data.soldAt ? convertTimestampToISO(data.soldAt as FirebaseTimestampType) : undefined,
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
    let allItems = querySnapshot.docs.map(mapDocToItem);

    // Filter for sold items older than 15 days
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    
    let fetchedItems = allItems.filter(item => {
        if (!item.isSold) return true; // Keep if not sold
        if (item.soldAt && new Date(item.soldAt) > fifteenDaysAgo) return true; // Keep if sold recently
        return false; // Hide if sold more than 15 days ago
    });

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

export const uploadImageAndGetURL = (imageFile: File, userId: string): Promise<string> => {
    if (!userId) {
        const errorMsg = "ITEM_SERVICE_UPLOAD_ERROR: User ID is required for image upload.";
        console.error(errorMsg);
        return Promise.reject(new Error(errorMsg));
    }
    if (!storage) {
        const errorMsg = "ITEM_SERVICE_UPLOAD_ERROR: Firebase Storage service is not initialized.";
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
            null, // No progress tracking for images in this implementation
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
    if (!userId) {
        const errorMsg = "ITEM_SERVICE_UPLOAD_ERROR: User ID is required for video upload.";
        console.error(errorMsg);
        return Promise.reject(new Error(errorMsg));
    }
    if (!storage) {
        const errorMsg = "ITEM_SERVICE_UPLOAD_ERROR: Firebase Storage service is not initialized.";
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
  try {
    const dataToSend: any = { ...itemData };
    if (dataToSend.videoUrl === undefined) {
      delete dataToSend.videoUrl;
    }

    const docRef = await addDoc(collection(db, "items"), {
      ...dataToSend,
      postedDate: serverTimestamp(),
    });
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
  
  // If the videoUrl key is present with an undefined value, it means we want to remove the field.
  if ('videoUrl' in dataToUpdate && dataToUpdate.videoUrl === undefined) {
      dataToUpdate.videoUrl = deleteField();
  }
  
  dataToUpdate.lastUpdated = serverTimestamp();

  try {
    await updateDoc(itemRef, dataToUpdate);
  } catch (error) {
    console.error(`SERVER: Error updating item ${itemId} in Firestore: `, error);
    throw error;
  }
}

export async function logItemView(itemId: string): Promise<void> {
  if (!itemId) {
    return;
  }
  try {
    const viewsCollectionRef = collection(db, 'items', itemId, 'views');
    await addDoc(viewsCollectionRef, {
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error(`SERVER: Error logging view for item ${itemId}:`, error);
  }
}

export async function markItemAsSold(itemId: string): Promise<void> {
  const itemRef = doc(db, 'items', itemId);
  await updateDoc(itemRef, {
    isSold: true,
    soldAt: serverTimestamp(),
  });
}

export async function deleteItem(itemId: string): Promise<void> {
  const item = await getItemByIdFromFirestore(itemId);
  if (!item) {
    throw new Error("Item not found, cannot delete.");
  }

  // Delete images from Firebase Storage
  const imageDeletePromises = item.imageUrls.map(url => {
    // Only attempt to delete images hosted on Firebase Storage
    if (url.includes('firebasestorage.googleapis.com')) {
      try {
        const imageRef = storageRef(storage, url);
        return deleteObject(imageRef);
      } catch (error) {
        console.error(`Failed to create storage reference for URL ${url}. It might be malformed.`, error);
        return Promise.resolve(); // Don't block other deletions
      }
    }
    return Promise.resolve(); // Ignore placeholders or other external URLs
  });

  // Delete video from Firebase Storage if it exists
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

  // Delete the item document from Firestore
  const itemDocRef = doc(db, 'items', itemId);
  await deleteDoc(itemDocRef);
}
