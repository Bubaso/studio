
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  writeBatch,
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

  const itemRef = doc(db, 'items', itemId);
  const itemSnap = await getDoc(itemRef);

  if (!itemSnap.exists() || itemSnap.data().isSold || itemSnap.data().suspectedSold) {
    return { success: false, error: "Cet article n'est plus disponible ou a déjà été signalé." };
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
      await updateDoc(itemRef, {
        suspectedSold: true,
      });
      triggeredSuspectedSold = true;
      console.log(`Item ${itemId} marked as suspected sold. Seller should be notified.`);
    }

    return { success: true, triggeredSuspectedSold };
  } catch (error: any) {
    console.error('Error counting reports or updating item:', error);
    return { success: true, error: 'Le signalement a été soumis, mais une erreur est survenue lors de la mise à jour du statut.' };
  }
}

export async function deleteReportsForItem(itemId: string): Promise<void> {
    if (!itemId) {
        console.warn("deleteReportsForItem called without an itemId.");
        return;
    }
    const reportsCollectionRef = collection(db, 'productReports', itemId, 'reports');
    try {
        const reportsSnapshot = await getDocs(reportsCollectionRef);
        if (reportsSnapshot.empty) {
            return; 
        }
        const batch = writeBatch(db);
        reportsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Successfully deleted ${reportsSnapshot.size} reports for item ${itemId}.`);
    } catch (error) {
        console.error(`Failed to delete reports for item ${itemId}:`, error);
        throw new Error("Impossible de réinitialiser les signalements pour cet article.");
    }
}
