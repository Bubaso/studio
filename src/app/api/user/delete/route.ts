
import 'dotenv/config'; // Explicitly load environment variables
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminInstances } from '@/lib/firebaseAdmin';
import { getStorage } from 'firebase-admin/storage';

// Helper function to extract storage path from a Firebase Storage URL
function getPathFromUrl(url: string): string | null {
  if (!url || !url.startsWith('https://firebasestorage.googleapis.com/v0/b/')) {
    return null;
  }
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
      console.error("Deletion Error: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set in environment variables.");
      return null;
  };
  
  const pathPrefix = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/`;
  const encodedPath = url.substring(pathPrefix.length).split('?')[0];
  try {
    return decodeURIComponent(encodedPath);
  } catch (e) {
    console.error("Failed to decode URL path component:", encodedPath, e);
    return null;
  }
}

// Helper to add all documents in a collection to a write batch for deletion.
async function addCollectionDeletionsToBatch(collectionRef: FirebaseFirestore.CollectionReference, batch: FirebaseFirestore.WriteBatch) {
    const { db: adminDb } = getAdminInstances();
    if (!adminDb) return;
    const snapshot = await collectionRef.get();
    if (snapshot.empty) return;
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
}


export async function POST(request: NextRequest) {
  let adminAuth, adminDb, app, storage;
  try {
      ({ auth: adminAuth, db: adminDb, app, storage } = getAdminInstances());
  } catch (error: any) {
      console.error("API DELETE USER - FAILED TO INIT ADMIN:", error.message);
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
  const bucket = storage.bucket();

  try {
    // --- Step 1: Collect all user data references and media URLs ---
    console.log(`[DELETE USER ${uid}] Step 1: Collecting user's items and media URLs...`);
    const itemsQuery = adminDb.collection('items').where('sellerId', '==', uid);
    const itemsSnapshot = await itemsQuery.get();
    const itemMediaUrls: string[] = [];
    
    itemsSnapshot.forEach(doc => {
        const itemData = doc.data();
        if (itemData.imageUrls && Array.isArray(itemData.imageUrls)) {
            itemMediaUrls.push(...itemData.imageUrls);
        }
        if (itemData.videoUrl) {
            itemMediaUrls.push(itemData.videoUrl);
        }
    });

    const userDocRef = adminDb.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();
    if (userDocSnap.exists && userDocSnap.data()?.avatarUrl) {
        itemMediaUrls.push(userDocSnap.data()?.avatarUrl);
    }
    console.log(`[DELETE USER ${uid}] ... found ${itemsSnapshot.docs.length} items and ${itemMediaUrls.length} total media files.`);

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

    // --- Step 3: Concurrently prepare all Firestore deletions ---
    console.log(`[DELETE USER ${uid}] Step 3: Preparing Firestore deletions...`);
    const batch = adminDb.batch();

    // Concurrently get all subcollections to delete for items
    const itemSubcollectionPromises = itemsSnapshot.docs.map(itemDoc => 
        addCollectionDeletionsToBatch(itemDoc.ref.collection('views'), batch)
    );
    // Add items themselves to the batch
    itemsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Get user's 'collections'
    const collectionsQuery = adminDb.collection('collections').where('userId', '==', uid);
    const collectionsSnapshot = await collectionsQuery.get();
    
    // Concurrently get all subcollections to delete for user's collections
    const collectionSubItemsPromises = collectionsSnapshot.docs.map(collectionDoc =>
        addCollectionDeletionsToBatch(collectionDoc.ref.collection('items'), batch)
    );
    // Add the user's collections themselves to the batch
    collectionsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    
    // Concurrently get other collections to delete
    const reviewsQuery = adminDb.collection('reviews').where('reviewerId', '==', uid);
    const reviewsSnapshotPromise = reviewsQuery.get();

    // Await all concurrent read operations
    const [reviewsSnapshot, ..._] = await Promise.all([
        reviewsSnapshotPromise,
        ...itemSubcollectionPromises,
        ...collectionSubItemsPromises
    ]);
    
    // Add results to the batch
    reviewsSnapshot.forEach(doc => batch.delete(doc.ref));
    
    // Handle user's direct subcollections
    await addCollectionDeletionsToBatch(userDocRef.collection('subscriptions'), batch);
    await addCollectionDeletionsToBatch(userDocRef.collection('subscribers'), batch);
    await addCollectionDeletionsToBatch(userDocRef.collection('notifications'), batch);
    await addCollectionDeletionsToBatch(userDocRef.collection('viewHistory'), batch);

    // Finally, add the main user document itself to the batch
    batch.delete(userDocRef);
    
    // --- Step 4: Commit the master Firestore batch deletion ---
    console.log(`[DELETE USER ${uid}] Committing Firestore batch deletion...`);
    await batch.commit();
    console.log(`[DELETE USER ${uid}] Firestore data deletion committed successfully.`);

    // --- Final Step: Delete the user from Firebase Auth ---
    console.log(`[DELETE USER ${uid}] Step 5: Deleting user from Firebase Auth...`);
    await adminAuth.deleteUser(uid);
    console.log(`[DELETE USER ${uid}] Successfully deleted user from Auth.`);

    return NextResponse.json({ success: true, message: 'Compte supprimé avec succès.' });

  } catch (error: any) {
    console.error(`API DELETE USER: Error during account deletion for ${uid}:`, error);
    return NextResponse.json({ error: error.message || "Une erreur interne s'est produite lors de la suppression du compte." }, { status: 500 });
  }
}

