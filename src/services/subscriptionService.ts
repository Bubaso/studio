
'use client';

import { db, auth } from '@/lib/firebase';
import {
  doc,
  getDoc,
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
 * Toggles the subscription status between two users by calling a secure API route.
 * @param currentUserId - The user initiating the action.
 * @param targetUserId - The user being subscribed to or unsubscribed from.
 * @returns An object indicating success and the new subscription status.
 */
export async function toggleSubscription(currentUserId: string, targetUserId: string): Promise<{ success: boolean, isSubscribed?: boolean, error?: string }> {
  if (!auth.currentUser || auth.currentUser.uid !== currentUserId) {
    return { success: false, error: "User not authenticated or ID mismatch." };
  }
  
  try {
    const idToken = await auth.currentUser.getIdToken();
    const response = await fetch('/api/user/toggle-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({ targetUserId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to toggle subscription.");
    }

    return { success: true, isSubscribed: data.isSubscribed };

  } catch (error: any) {
    console.error("Error calling toggle subscription API:", error);
    return { success: false, error: error.message };
  }
}
