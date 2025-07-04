
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import type { Notification } from '@/lib/types';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  doc,
  Timestamp,
  DocumentSnapshot,
} from 'firebase-admin/firestore';

const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
    if (!timestamp) return new Date().toISOString();
    if (typeof timestamp === 'string') return timestamp;
    if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
      return (timestamp as Timestamp).toDate().toISOString();
    }
    return new Date().toISOString();
  };

const mapDocToNotification = (doc: DocumentSnapshot): Notification => {
    const data = doc.data()!;
    return {
        id: doc.id,
        ...data,
        createdAt: convertTimestampToISO(data.createdAt as Timestamp),
    } as Notification;
}

export async function createNotification(userId: string, notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'userId'>) {
    if (!userId) {
        console.error("User ID is required to create a notification.");
        return;
    }
    try {
        const notificationsRef = collection(db, `users/${userId}/notifications`);
        await addDoc(notificationsRef, {
            ...notificationData,
            userId,
            createdAt: serverTimestamp(),
            isRead: false,
        });
    } catch (error) {
        console.error(`Error creating notification for user ${userId}:`, error);
    }
}

export async function getNotificationsForUser(userId: string, count: number = 10): Promise<Notification[]> {
    if (!userId) return [];
    try {
        const notificationsRef = collection(db, 'users', userId, 'notifications');
        const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(count));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(mapDocToNotification);
    } catch (error) {
        console.error(`Error fetching notifications for user ${userId}:`, error);
        return [];
    }
}


export async function markAllNotificationsAsRead(userId: string): Promise<{ success: boolean }> {
  if (!userId) return { success: false };
  const notificationsRef = collection(db, 'users', userId, 'notifications');
  // We query without a 'where' clause to avoid needing a custom index.
  // We will filter for unread notifications in the code.
  const q = query(notificationsRef);
  
  try {
    const querySnapshot = await getDocs(q);
    
    // Filter for unread documents in code.
    const unreadDocs = querySnapshot.docs.filter(doc => doc.data().isRead === false);

    if (unreadDocs.length === 0) {
      return { success: true }; // No unread notifications to mark.
    }
    
    const batch = writeBatch(db);
    unreadDocs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error(`Error marking all notifications as read for user ${userId}:`, error);
    return { success: false };
  }
}
