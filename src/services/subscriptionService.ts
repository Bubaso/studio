
'use client';

import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  runTransaction,
  increment,
} from 'firebase/firestore';

/**
 * Checks if a user is subscribed to another user.
 * @param currentUserId - The ID of the user checking the subscription.
 * @param targetUserId - The ID of the user being checked.
 * @returns true if subscribed, false otherwise.
 */
export async function checkSubscription(currentUserId: string, targetUserId: string): Promise<boolean> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) return false;
  try {
    const subscriptionRef = doc(db, `users/${currentUserId}/subscriptions`, targetUserId);
    const docSnap = await getDoc(subscriptionRef);
    return docSnap.exists();
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return false;
  }
}

/**
 * Toggles the subscription status between two users.
 * @param currentUserId - The user initiating the action.
 * @param targetUserId - The user being subscribed to or unsubscribed from.
 * @returns An object indicating success and the new subscription status.
 */
export async function toggleSubscription(currentUserId: string, targetUserId: string): Promise<{ success: boolean, isSubscribed: boolean, error?: string }> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { success: false, isSubscribed: false, error: "Invalid user IDs provided." };
  }

  const currentUserRef = doc(db, 'users', currentUserId);
  const targetUserRef = doc(db, 'users', targetUserId);
  const subscriptionRef = doc(currentUserRef, 'subscriptions', targetUserId);
  const subscriberRef = doc(targetUserRef, 'subscribers', currentUserId);

  let isCurrentlySubscribed = false; 

  try {
    const subscriptionDoc = await getDoc(subscriptionRef);
    isCurrentlySubscribed = subscriptionDoc.exists();

    await runTransaction(db, async (transaction) => {
      const currentUserDoc = await transaction.get(currentUserRef);
      const targetUserDoc = await transaction.get(targetUserRef);

      if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
        throw new Error("User profile not found.");
      }
      
      const currentUserData = currentUserDoc.data();
      const targetUserData = targetUserDoc.data();

      if (isCurrentlySubscribed) {
        // Unsubscribe logic
        transaction.delete(subscriptionRef);
        transaction.delete(subscriberRef);
        // Manually decrement counts
        const newSubscriptionCount = (currentUserData.subscriptionCount || 1) - 1;
        const newSubscriberCount = (targetUserData.subscriberCount || 1) - 1;
        transaction.update(currentUserRef, { subscriptionCount: newSubscriptionCount < 0 ? 0 : newSubscriptionCount });
        transaction.update(targetUserRef, { subscriberCount: newSubscriberCount < 0 ? 0 : newSubscriberCount });

      } else {
        // Subscribe logic
        transaction.set(subscriptionRef, { subscribedAt: new Date() });
        transaction.set(subscriberRef, { subscribedAt: new Date() });
        // Manually increment counts
        const newSubscriptionCount = (currentUserData.subscriptionCount || 0) + 1;
        const newSubscriberCount = (targetUserData.subscriberCount || 0) + 1;
        transaction.update(currentUserRef, { subscriptionCount: newSubscriptionCount });
        transaction.update(targetUserRef, { subscriberCount: newSubscriberCount });
      }
    });

    return { success: true, isSubscribed: !isCurrentlySubscribed };

  } catch (error: any) {
    console.error("Error toggling subscription:", error);
    return { success: false, isSubscribed: isCurrentlySubscribed, error: "An error occurred. Please try again." };
  }
}
