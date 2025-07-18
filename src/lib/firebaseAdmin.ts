
import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;
let initializedAdmin: typeof admin | null = null;

// Use a new environment variable to hold the JSON content directly
const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

const isConfigValid = serviceAccountJson && serviceAccountJson.trim() !== '' && !serviceAccountJson.includes('REPLACE_WITH');

if (!isConfigValid) {
  console.error("CRITICAL FIREBASE ADMIN ERROR: FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not set or is a placeholder. Server-side Firebase features will be disabled.");
} else if (getApps().length === 0) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    adminDb = getFirestore(app);
    adminAuth = getAuth(app);
    initializedAdmin = admin;
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('CRITICAL FIREBASE ADMIN INIT ERROR: Could not parse FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON or initialize app:', error.message);
    console.error(
        'Ensure the FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON environment variable contains a valid, non-stringified service account JSON object.'
    );
    // Keep services as null
  }
} else {
  const app = admin.app();
  adminDb = getFirestore(app);
  adminAuth = getAuth(app);
  initializedAdmin = admin;
}

export { adminDb, adminAuth, initializedAdmin };
