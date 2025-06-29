// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore | null = null;
let adminAuth: admin.auth.Auth | null = null;
let initializedAdmin: typeof admin | null = null;

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

const isConfigValid = serviceAccountPath && !serviceAccountPath.includes('REPLACE_WITH_');

if (!isConfigValid) {
  console.error("CRITICAL FIREBASE ADMIN ERROR: GOOGLE_APPLICATION_CREDENTIALS is not set or is a placeholder. Server-side Firebase features will be disabled.");
} else if (admin.apps.length === 0) {
  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    adminDb = admin.firestore(app);
    adminAuth = admin.auth(app);
    initializedAdmin = admin;
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('CRITICAL FIREBASE ADMIN INIT ERROR: Firebase Admin SDK initialization error:', error.message);
    console.error(
        'Ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable points to a valid service account JSON file and that the file is correctly formatted.'
    );
    // Keep services as null
  }
} else {
  const app = admin.app();
  adminDb = admin.firestore(app);
  adminAuth = admin.auth(app);
  initializedAdmin = admin;
  console.log('Using existing Firebase Admin SDK app instance.');
}

export { adminDb, adminAuth };
export default initializedAdmin;