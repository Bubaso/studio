
'use server';

import { adminDb as db } from '@/lib/firebaseAdmin';
import type { Notification } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
    if (!timestamp) return new Date().toISOString();
    if (typeof timestamp === 'string') return timestamp;
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    console.warn('Invalid timestamp format encountered in notificationService:', timestamp);
    return new Date().toISOString();
  };

const mapDocToNotification = (doc: FirebaseFirestore.DocumentSnapshot): Notification => {
    const data = doc.data()!;
    return {
        id: doc.id,
        ...data,
        createdAt: convertTimestampToISO(data.createdAt as Timestamp),
    } as Notification;
}

export async function createNotification(userId: string, notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead' | 'userId'>) {
    if (!userId || !db) {
        console.error("User ID and db instance are required to create a notification.");
        return;
    }
    try {
        const notificationsRef = db.collection(`users/${userId}/notifications`);
        await notificationsRef.add({
            ...notificationData,
            userId,
            createdAt: Timestamp.now(),
            isRead: false,
        });
    } catch (error) {
        console.error(`Error creating notification for user ${userId}:`, error);
    }
}

export async function getNotificationsForUser(userId: string, count: number = 10): Promise<Notification[]> {
    if (!userId || !db) return [];
    try {
        const notificationsRef = db.collection('users').doc(userId).collection('notifications');
        const q = notificationsRef.orderBy('createdAt', 'desc').limit(count);
        const querySnapshot = await q.get();
        return querySnapshot.docs.map(mapDocToNotification);
    } catch (error) {
        console.error(`Error fetching notifications for user ${userId}:`, error);
        return [];
    }
}


export async function markAllNotificationsAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!userId || !db) return { success: false, error: "L'ID utilisateur ou la base de données n'est pas disponible" };
  
  const notificationsRef = db.collection('users').doc(userId).collection('notifications');
  
  try {
    const querySnapshot = await notificationsRef.get();
    
    // Filter for unread documents in code to avoid needing a composite index.
    const unreadDocs = querySnapshot.docs.filter(doc => doc.data().isRead === false);

    if (unreadDocs.length === 0) {
      return { success: true }; // No unread notifications to mark.
    }
    
    const batch = db.batch();
    unreadDocs.forEach(doc => {
      batch.update(doc.ref, { isRead: true });
    });
    
    await batch.commit();
    return { success: true };
  } catch (error: any) {
    console.error(`Error marking all notifications as read for user ${userId}:`, error);
    return { success: false, error: "Impossible de marquer les notifications comme lues." };
  }
}
