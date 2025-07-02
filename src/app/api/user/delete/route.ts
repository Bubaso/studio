
import { NextResponse, type NextRequest } from 'next/server';
import admin, { adminDb, adminAuth } from '@/lib/firebaseAdmin';
import { getStorage } from 'firebase-admin/storage';

// Helper function to extract storage path from a Firebase Storage URL
function getPathFromUrl(url: string): string | null {
  if (!url || !url.startsWith('https://firebasestorage.googleapis.com/v0/b/')) {
    return null;
  }
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) return null;
  
  const pathPrefix = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/`;
  const encodedPath = url.substring(pathPrefix.length).split('?')[0];
  try {
    return decodeURIComponent(encodedPath);
  } catch (e) {
    console.error("Failed to decode URL path component:", encodedPath, e);
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!admin || !adminAuth || !adminDb) {
    return NextResponse.json({ error: "Configuration du serveur Firebase Admin manquante." }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    console.error('API DELETE USER: Invalid ID token', error);
    return NextResponse.json({ error: 'Session invalide ou expirée.' }, { status: 403 });
  }

  const uid = decodedToken.uid;
  const storage = getStorage(admin.app());
  const bucket = storage.bucket();

  try {
    const deletePromises: Promise<any>[] = [];

    // --- Step 1: Delete User's Listings and associated files ---
    const itemsQuery = adminDb.collection('items').where('sellerId', '==', uid);
    const itemsSnapshot = await itemsQuery.get();
    
    if (!itemsSnapshot.empty) {
      const itemBatch = adminDb.batch();
      itemsSnapshot.forEach(doc => {
        const itemData = doc.data();
        // Delete item images
        if (itemData.imageUrls && Array.isArray(itemData.imageUrls)) {
          itemData.imageUrls.forEach((url: string) => {
            const path = getPathFromUrl(url);
            if (path) {
              deletePromises.push(bucket.file(path).delete().catch(e => console.error(`Failed to delete item image ${path}:`, e)));
            }
          });
        }
        // Delete item video
        if (itemData.videoUrl) {
           const path = getPathFromUrl(itemData.videoUrl);
           if (path) {
              deletePromises.push(bucket.file(path).delete().catch(e => console.error(`Failed to delete item video ${path}:`, e)));
           }
        }
        itemBatch.delete(doc.ref);
      });
      deletePromises.push(itemBatch.commit());
    }

    // --- Step 2: Delete User's Profile and Avatar ---
    const userDocRef = adminDb.collection('users').doc(uid);
    const userDoc = await userDocRef.get();
    if (userDoc.exists()) {
      const userData = userDoc.data();
      // Delete avatar
      if (userData?.avatarUrl) {
        const path = getPathFromUrl(userData.avatarUrl);
        if (path) {
           deletePromises.push(bucket.file(path).delete().catch(e => console.error(`Failed to delete avatar ${path}:`, e)));
        }
      }
      // Delete user document
      deletePromises.push(userDocRef.delete());
    }
    
    // Execute all Firestore and Storage deletion promises
    await Promise.all(deletePromises);
    
    // --- Final Step: Delete the user from Firebase Auth ---
    await adminAuth.deleteUser(uid);

    return NextResponse.json({ success: true, message: 'Compte supprimé avec succès.' });

  } catch (error: any) {
    console.error(`API DELETE USER: Error deleting user ${uid}:`, error);
    return NextResponse.json({ error: "Une erreur interne s'est produite lors de la suppression du compte." }, { status: 500 });
  }
}
