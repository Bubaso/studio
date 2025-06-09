
import { db, storage } from '@/lib/firebase'; // Added storage
import type { Item, ItemCategory, ItemCondition } from '@/lib/types';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit, QueryConstraint } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage"; // Firebase Storage functions

// Helper to convert Firestore Timestamp to ISO string
const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp; // Already a string
  return timestamp.toDate().toISOString();
};

const mapDocToItem = (document: any): Item => {
  const data = document.data();
  let imageUrls: string[] = ['https://placehold.co/600x400.png']; // Default placeholder

  if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
    imageUrls = data.imageUrls;
  } else if (typeof data.imageUrl === 'string') { // Backward compatibility for old single imageUrl
    imageUrls = [data.imageUrl];
  }

  return {
    id: document.id,
    name: data.name || '',
    description: data.description || '',
    price: data.price || 0,
    category: data.category || 'Autre',
    location: data.location || '',
    imageUrls: imageUrls,
    sellerId: data.sellerId || 'unknown',
    sellerName: data.sellerName || 'Vendeur inconnu',
    postedDate: convertTimestampToISO(data.postedDate),
    condition: data.condition,
    dataAiHint: data.dataAiHint || `${data.category} ${data.name?.split(' ')[0]}`.toLowerCase(),
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

    if (filters?.count) {
      queryConstraints.push(limit(filters.count));
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

    return fetchedItems;
  } catch (error) {
    console.error("Error fetching items from Firestore: ", error);
    return [];
  }
};

export const getItemByIdFromFirestore = async (id: string): Promise<Item | null> => {
  try {
    const itemDocRef = doc(db, 'items', id);
    const docSnap = await getDoc(itemDocRef);

    if (docSnap.exists()) {
      return mapDocToItem(docSnap);
    } else {
      console.log("No such document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching item by ID from Firestore: ", error);
    return null;
  }
};

export const getUserListingsFromFirestore = async (userId: string): Promise<Item[]> => {
  try {
    const itemsCollectionRef = collection(db, 'items');
    const q = query(itemsCollectionRef, where('sellerId', '==', userId), orderBy('postedDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocToItem);
  } catch (error) {
    console.error("Error fetching user listings from Firestore: ", error);
    return [];
  }
};

export const uploadImageAndGetURL = async (imageFile: File, userId: string): Promise<string> => {
  const uniqueFileName = `${Date.now()}_${imageFile.name}`;
  const imageRef = storageRef(storage, `items/${userId}/${uniqueFileName}`);
  try {
    const snapshot = await uploadBytes(imageRef, imageFile);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading image: ", error);
    throw error; // Re-throw error to be caught by the form
  }
};
