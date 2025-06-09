
'use server'; // Can be called from server actions

import { db } from '@/lib/firebase';
import type { Review } from '@/lib/types';
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  Timestamp,
  doc,
  getDoc,
  DocumentSnapshot,
} from 'firebase/firestore';

// Helper to convert Firestore Timestamp to ISO string (consistent with other services)
const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
    try {
      return (timestamp as Timestamp).toDate().toISOString();
    } catch (e) {
      console.warn('Error converting timestamp toDate in reviewService:', timestamp, e);
      return new Date().toISOString();
    }
  }
  console.warn('Invalid timestamp format encountered in reviewService:', timestamp);
  return new Date().toISOString();
};

const mapDocToReview = (document: DocumentSnapshot): Review => {
  const data = document.data()!;
  return {
    id: document.id,
    itemId: data.itemId,
    sellerId: data.sellerId,
    reviewerId: data.reviewerId,
    reviewerName: data.reviewerName || 'Auteur inconnu',
    reviewerAvatarUrl: data.reviewerAvatarUrl || null,
    rating: data.rating,
    comment: data.comment,
    createdAt: convertTimestampToISO(data.createdAt as Timestamp),
  };
};

export interface ReviewData {
  itemId: string;
  sellerId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatarUrl?: string | null;
  rating: number;
  comment: string;
}

export async function addReviewToFirestore(reviewData: ReviewData): Promise<Review> {
  try {
    const reviewCollectionRef = collection(db, 'reviews');
    const docRef = await addDoc(reviewCollectionRef, {
      ...reviewData,
      createdAt: serverTimestamp(),
    });

    // Fetch the just-added document to get the server-generated timestamp and ID
    const newReviewSnap = await getDoc(docRef);
    if (!newReviewSnap.exists()) {
        throw new Error("Failed to fetch the newly created review.");
    }
    return mapDocToReview(newReviewSnap);

  } catch (error) {
    console.error('Error adding review to Firestore:', error);
    throw new Error('Could not submit review.');
  }
}

export async function getReviewsForItem(itemId: string): Promise<Review[]> {
  if (!itemId) return [];
  try {
    const reviewsCollectionRef = collection(db, 'reviews');
    const q = query(
      reviewsCollectionRef,
      where('itemId', '==', itemId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(mapDocToReview);
  } catch (error) {
    console.error(`Error fetching reviews for item ${itemId}:`, error);
    return [];
  }
}

export async function checkIfUserHasReviewedItem(userId: string, itemId: string): Promise<boolean> {
  if (!userId || !itemId) return false;
  try {
    const reviewsCollectionRef = collection(db, 'reviews');
    const q = query(
      reviewsCollectionRef,
      where('itemId', '==', itemId),
      where('reviewerId', '==', userId)
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty; // True if one or more reviews exist
  } catch (error) {
    console.error(`Error checking if user ${userId} reviewed item ${itemId}:`, error);
    return false; // Assume not reviewed on error to be safe
  }
}
