
import * as admin from 'firebase-admin';
import { getApps, initializeApp, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let app: App;
let auth: Auth;
let db: Firestore;
let storage: ReturnType<typeof getStorage>;
let initialized = false;

function initializeAdmin() {
  if (initialized) {
    return;
  }

  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

  if (getApps().length === 0) {
    try {
      if (serviceAccountJson && serviceAccountJson.length > 10) {
        // Attempt to initialize with the provided JSON credentials
        console.log("Attempting to initialize Firebase Admin with provided service account JSON...");
        const serviceAccount = JSON.parse(serviceAccountJson);
        app = initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
      } else {
        // Fallback to Application Default Credentials, which is standard for App Hosting
        console.log("Attempting to initialize Firebase Admin with Application Default Credentials...");
        app = initializeApp({
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
      }
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (error: any) {
      console.error('CRITICAL FIREBASE ADMIN INIT ERROR:', error.message);
      // Do not throw here, as it can crash the server process on a non-critical error.
      // Let the exports be undefined so that subsequent calls fail gracefully.
      return;
    }
  } else {
    app = getApp();
  }

  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  initialized = true;
}

// Initialize on first import.
initializeAdmin();

// Export the initialized instances directly.
export { initializedAdmin, adminDb, adminAuth };

// For API routes that need a guaranteed fresh instance, they can call this function.
// This is a more advanced pattern and not typically needed.
export function getAdminInstances() {
    if (!initialized) {
        initializeAdmin();
    }
    if (!app || !auth || !db) {
        throw new Error("Could not initialize Firebase Admin SDK. Check server logs for configuration errors.");
    }
    return { app, auth, db, storage };
}

// Deprecated original exports for backward compatibility during transition.
const initializedAdmin = admin;
const adminDb = db;
const adminAuth = auth;

