
'use server';

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

export async function hasUserReportedItem(
  itemId: string,
  userId: string
): Promise<boolean> {
  if (!itemId || !userId) return false;
  const reportRef = doc(db, 'productReports', itemId, 'reports', userId);
  try {
    const docSnap = await getDoc(reportRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking for existing report:', error);
    return false; // Fail safe
  }
}

export async function reportItemAsSold(
  itemId: string,
  userId: string
): Promise<{ success: boolean; error?: string; triggeredSuspectedSold?: boolean }> {
  if (!itemId || !userId) {
    return { success: false, error: "L'ID de l'article et de l'utilisateur sont requis." };
  }

  // 1. Check if user already reported
  const alreadyReported = await hasUserReportedItem(itemId, userId);
  if (alreadyReported) {
    return { success: false, error: 'Vous avez déjà signalé cet article.' };
  }

  // 2. Add the new report
  const reportRef = doc(db, 'productReports', itemId, 'reports', userId);
  try {
    await setDoc(reportRef, {
      userId,
      reportedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error creating report:', error);
    return { success: false, error: "Impossible de soumettre le signalement." };
  }

  // 3. Count reports and update item if needed
  let triggeredSuspectedSold = false;
  try {
    const reportsCollectionRef = collection(db, 'productReports', itemId, 'reports');
    const reportsSnapshot = await getDocs(reportsCollectionRef);
    const reportCount = reportsSnapshot.size;

    if (reportCount >= 2) {
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        suspectedSold: true,
      });
      triggeredSuspectedSold = true;
      // TODO: Implement seller push notification logic here.
      // This part requires a more complex setup (e.g., Cloud Functions, user FCM tokens)
      // which is beyond the current scope.
      console.log(`Item ${itemId} marked as suspected sold. Seller should be notified.`);
    }

    return { success: true, triggeredSuspectedSold };
  } catch (error: any) {
    console.error('Error counting reports or updating item:', error);
    // The report was submitted, but the subsequent logic failed.
    // Return success but log the error.
    return { success: true, error: 'Le signalement a été soumis, mais une erreur est survenue lors de la mise à jour du statut.' };
  }
}
