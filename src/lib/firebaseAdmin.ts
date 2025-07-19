

import * as admin from 'firebase-admin';
import { getApps, initializeApp, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
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
        console.log("Attempting to initialize Firebase Admin with provided service account JSON...");
        const serviceAccount = JSON.parse(serviceAccountJson);
        app = initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
      } else {
        console.log("Attempting to initialize Firebase Admin with Application Default Credentials...");
        app = initializeApp({
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });
      }
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (error: any) {
      console.error('CRITICAL FIREBASE ADMIN INIT ERROR:', error.message);
      // Let subsequent calls fail gracefully.
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

// Deprecated original exports for backward compatibility during transition.
const initializedAdmin = admin;
const adminDb = db;
const adminAuth = auth;
export { initializedAdmin, adminDb, adminAuth };


export function getAdminInstances() {
    if (!initialized) {
        initializeAdmin();
    }
    if (!app || !auth || !db) {
        throw new Error("Could not initialize Firebase Admin SDK. Check server logs for configuration errors.");
    }
    return { app, auth, db, storage };
}

// New server-side function to handle user counter
export async function incrementUserCounter(): Promise<{ userCount: number, isFoundingMember: boolean }> {
  const { db: firestore } = getAdminInstances();
  const counterRef = firestore.collection('_counters').doc('users');
  
  let newCount = 0;
  
  await firestore.runTransaction(async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    if (!counterSnap.exists) {
      newCount = 1;
      transaction.set(counterRef, { count: newCount });
    } else {
      newCount = (counterSnap.data()?.count || 0) + 1;
      transaction.update(counterRef, { count: newCount });
    }
  });

  return {
    userCount: newCount,
    isFoundingMember: newCount <= 100,
  };
}
