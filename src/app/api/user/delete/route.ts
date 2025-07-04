
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
async function deleteCollectionInBatches(collectionRef: admin.firestore.CollectionReference, batchSize: number) {
    if (!adminDb) return;
    const query = collectionRef.limit(batchSize);
    let snapshot = await query.get();

    while (snapshot.size > 0) {
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        
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
  const allPromises: Promise<any>[] = [];

  try {
    // --- Step 1: Delete User's Listings and associated files/subcollections ---
    const itemsQuery = adminDb.collection('items').where('sellerId', '==', uid);
    const itemsSnapshot = await itemsQuery.get();
    
    if (!itemsSnapshot.empty) {
      const itemBatch = adminDb.batch();
      itemsSnapshot.forEach(doc => {
        const itemData = doc.data();
        // Delete item images from storage
        if (itemData.imageUrls && Array.isArray(itemData.imageUrls)) {
          itemData.imageUrls.forEach((url: string) => {
            const path = getPathFromUrl(url);
            if (path) {
              allPromises.push(bucket.file(path).delete().catch(e => console.error(`Failed to delete item image ${path}:`, e)));
            }
          });
        }
        // Delete item video from storage
        if (itemData.videoUrl) {
           const path = getPathFromUrl(itemData.videoUrl);
           if (path) {
              allPromises.push(bucket.file(path).delete().catch(e => console.error(`Failed to delete item video ${path}:`, e)));
           }
        }
        // Delete item's 'views' subcollection
        allPromises.push(deleteCollectionInBatches(doc.ref.collection('views'), 100));
        
        // Add item doc deletion to the batch
        itemBatch.delete(doc.ref);
      });
      allPromises.push(itemBatch.commit());
    }

    // --- Step 2: Delete user-owned `collections` and their subcollections ---
    const collectionsQuery = adminDb.collection('collections').where('userId', '==', uid);
    const collectionsSnapshot = await collectionsQuery.get();
    if (!collectionsSnapshot.empty) {
        const collectionBatch = adminDb.batch();
        collectionsSnapshot.forEach(doc => {
            allPromises.push(deleteCollectionInBatches(doc.ref.collection('items'), 100));
            collectionBatch.delete(doc.ref);
        });
        allPromises.push(collectionBatch.commit());
    }
    
    // --- Step 3: Delete user-owned `userFavorites` (legacy) ---
    const favoritesQuery = adminDb.collection('userFavorites').where('userId', '==', uid);
    const favoritesSnapshot = await favoritesQuery.get();
    if (!favoritesSnapshot.empty) {
        const favoritesBatch = adminDb.batch();
        favoritesSnapshot.forEach(doc => favoritesBatch.delete(doc.ref));
        allPromises.push(favoritesBatch.commit());
    }


    // --- Step 4: Delete user-made `reviews` ---
    const reviewsQuery = adminDb.collection('reviews').where('reviewerId', '==', uid);
    const reviewsSnapshot = await reviewsQuery.get();
    if(!reviewsSnapshot.empty) {
        const reviewBatch = adminDb.batch();
        reviewsSnapshot.forEach(doc => reviewBatch.delete(doc.ref));
        allPromises.push(reviewBatch.commit());
    }
    
    // --- Step 5: Delete User's Profile, Avatar, and Subcollections ---
    const userDocRef = adminDb.collection('users').doc(uid);
    const userDoc = await userDocRef.get();
    if (userDoc.exists()) {
      const userData = userDoc.data();
      // Delete avatar from storage
      if (userData?.avatarUrl) {
        const path = getPathFromUrl(userData.avatarUrl);
        if (path) {
           allPromises.push(bucket.file(path).delete().catch(e => console.error(`Failed to delete avatar ${path}:`, e)));
        }
      }
      // Delete user's subcollections
      allPromises.push(deleteCollectionInBatches(userDocRef.collection('subscriptions'), 100));
      allPromises.push(deleteCollectionInBatches(userDocRef.collection('subscribers'), 100));
      allPromises.push(deleteCollectionInBatches(userDocRef.collection('notifications'), 100));
      allPromises.push(deleteCollectionInBatches(userDocRef.collection('viewHistory'), 100));

      // Finally, schedule the main user doc for deletion
      allPromises.push(userDocRef.delete());
    }

    // TODO: Handle user's presence in other users' `subscribers` list. This is more complex and can be a phase 2.
    // TODO: Handle `productReports` made by the user.

    // Execute all deletion promises
    await Promise.all(allPromises);
    
    // --- Final Step: Delete the user from Firebase Auth ---
    // This should be the very last step.
    await adminAuth.deleteUser(uid);

    return NextResponse.json({ success: true, message: 'Compte supprimé avec succès.' });

  } catch (error: any) {
    console.error(`API DELETE USER: Error deleting user ${uid}:`, error);
    return NextResponse.json({ error: "Une erreur interne s'est produite lors de la suppression du compte." }, { status: 500 });
  }
}

    