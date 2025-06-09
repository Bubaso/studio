
import { db } from '@/lib/firebase';
import type { Item, ItemCategory, ItemCondition } from '@/lib/types';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit, QueryConstraint } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';

// Helper to convert Firestore Timestamp to ISO string
const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp; // Already a string
  return timestamp.toDate().toISOString();
};

const mapDocToItem = (document: any): Item => {
  const data = document.data();
  const seller = data.seller; // Assuming seller is an object with id and name for now
  return {
    id: document.id,
    name: data.name || '',
    description: data.description || '',
    price: data.price || 0,
    category: data.category || 'Autre',
    location: data.location || '',
    imageUrl: data.imageUrl || 'https://placehold.co/600x400.png',
    sellerId: data.sellerId || (seller?.id || 'unknown'), // Adapt based on your Firestore structure
    sellerName: data.sellerName || (seller?.name || 'Vendeur inconnu'), // Adapt based on your Firestore structure
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
    // Note: Firestore does not support full text search on partial strings like location or general query out of the box.
    // For location, you might need to filter client-side or use a more complex setup (e.g., Algolia/Typesense).
    // For query, consider searching by name for a simple implementation.
    if (filters?.query) {
        // Simple name search, case-insensitive would require more complex setup or fetching all and filtering
        // This is a limitation of basic Firestore queries.
        // For a more robust search, consider dedicated search services.
        // queryConstraints.push(where('name', '>=', filters.query));
        // queryConstraints.push(where('name', '<=', filters.query + '\uf8ff'));
    }
    
    queryConstraints.push(orderBy('postedDate', 'desc'));

    if (filters?.count) {
      queryConstraints.push(limit(filters.count));
    }
    
    const q = query(itemsCollectionRef, ...queryConstraints);
    const querySnapshot = await getDocs(q);
    let fetchedItems = querySnapshot.docs.map(mapDocToItem);

    // Client-side filtering for location and query as Firestore is limited here
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
    return []; // Return empty array on error
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

