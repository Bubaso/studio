
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

// Helper function to delete subcollections recursively.
// NOTE: This does not delete sub-sub-collections. For this app's structure, it's sufficient.
async function deleteCollectionInBatches(collectionRef: admin.firestore.CollectionReference, batch: admin.firestore.WriteBatch) {
    if (!adminDb) return;
    const query = collectionRef.limit(100);
    let snapshot = await query.get();

    while (snapshot.size > 0) {
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // Important: We don't commit the batch here. It will be committed once at the end.
        // We re-fetch the next batch.
        snapshot = await query.get();
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
    // --- Step 1: Collect all user data references and media URLs ---
    console.log(`[DELETE USER ${uid}] Step 1: Collecting all user data...`);
    
    // User's listings and associated media
    const itemsQuery = adminDb.collection('items').where('sellerId', '==', uid);
    const itemsSnapshot = await itemsQuery.get();
    const itemMediaUrls: string[] = [];
    const itemIds: string[] = [];
    itemsSnapshot.forEach(doc => {
        itemIds.push(doc.id);
        const itemData = doc.data();
        if (itemData.imageUrls && Array.isArray(itemData.imageUrls)) {
            itemMediaUrls.push(...itemData.imageUrls);
        }
        if (itemData.videoUrl) {
            itemMediaUrls.push(itemData.videoUrl);
        }
    });

    // User's avatar
    const userDocRef = adminDb.collection('users').doc(uid);
    const userDoc = await userDocRef.get();
    if (userDoc.exists() && userDoc.data()?.avatarUrl) {
        itemMediaUrls.push(userDoc.data()?.avatarUrl);
    }
    console.log(`[DELETE USER ${uid}]... found ${itemIds.length} items and ${itemMediaUrls.length} total media files.`);

    // --- Step 2: Delete all media from Storage ---
    console.log(`[DELETE USER ${uid}] Step 2: Deleting media files from Storage...`);
    const mediaDeletionPromises = itemMediaUrls.map(url => {
        const path = getPathFromUrl(url);
        if (path) {
            return bucket.file(path).delete().catch(e => console.error(`Failed to delete media file ${path}:`, e.message));
        }
        return Promise.resolve();
    });
    await Promise.allSettled(mediaDeletionPromises);
    console.log(`[DELETE USER ${uid}] Media deletion process completed.`);

    // --- Step 3: Delete all Firestore documents in a single large transaction ---
    console.log(`[DELETE USER ${uid}] Step 3: Preparing and running Firestore deletion transaction...`);
    const batch = adminDb.batch();

    // Delete items and their 'views' subcollections
    for (const itemId of itemIds) {
        const itemRef = adminDb.collection('items').doc(itemId);
        await deleteCollectionInBatches(itemRef.collection('views'), batch);
        batch.delete(itemRef);
    }

    // Delete user's 'collections' and their 'items' subcollections
    const collectionsQuery = adminDb.collection('collections').where('userId', '==', uid);
    const collectionsSnapshot = await collectionsQuery.get();
    for (const docSnap of collectionsSnapshot.docs) {
        await deleteCollectionInBatches(docSnap.ref.collection('items'), batch);
        batch.delete(docSnap.ref);
    }
    
    // Delete legacy 'userFavorites'
    const favoritesQuery = adminDb.collection('userFavorites').where('userId', '==', uid);
    const favoritesSnapshot = await favoritesQuery.get();
    favoritesSnapshot.forEach(doc => batch.delete(doc.ref));

    // Delete user-made 'reviews'
    const reviewsQuery = adminDb.collection('reviews').where('reviewerId', '==', uid);
    const reviewsSnapshot = await reviewsQuery.get();
    reviewsSnapshot.forEach(doc => batch.delete(doc.ref));
    
    // Delete user's subcollections ('subscriptions', 'subscribers', etc.)
    await deleteCollectionInBatches(userDocRef.collection('subscriptions'), batch);
    await deleteCollectionInBatches(userDocRef.collection('subscribers'), batch);
    await deleteCollectionInBatches(userDocRef.collection('notifications'), batch);
    await deleteCollectionInBatches(userDocRef.collection('viewHistory'), batch);

    // Finally, delete the main user document itself
    batch.delete(userDocRef);

    await batch.commit();
    console.log(`[DELETE USER ${uid}] Firestore data deletion committed successfully.`);

    // --- Final Step: Delete the user from Firebase Auth ---
    console.log(`[DELETE USER ${uid}] Step 4: Deleting user from Firebase Auth...`);
    await adminAuth.deleteUser(uid);
    console.log(`[DELETE USER ${uid}] Successfully deleted user from Auth.`);

    return NextResponse.json({ success: true, message: 'Compte supprimé avec succès.' });

  } catch (error: any) {
    console.error(`API DELETE USER: Error during account deletion for ${uid}:`, error);
    return NextResponse.json({ error: error.message || "Une erreur interne s'est produite lors de la suppression du compte." }, { status: 500 });
  }
}
