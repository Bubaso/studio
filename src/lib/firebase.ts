
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
  firebaseConfig.measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
}

let app: ReturnType<typeof getApp> | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let auth: Auth | null = null;

const isConfigPlaceholder = (value: string | undefined) => !value || value.includes('REPLACE_WITH');

const isConfigValid = !(
  isConfigPlaceholder(firebaseConfig.apiKey) ||
  isConfigPlaceholder(firebaseConfig.authDomain) ||
  isConfigPlaceholder(firebaseConfig.projectId) ||
  isConfigPlaceholder(firebaseConfig.storageBucket)
);

if (!isConfigValid) {
  console.error("CRITICAL FIREBASE CLIENT ERROR: Firebase configuration is missing or contains placeholder values in .env. The application will not be able to connect to Firebase services. Please update your environment variables.");
} else {
    try {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        db = getFirestore(app);
        storage = getStorage(app);
        auth = getAuth(app);
    } catch (error: any) {
        console.error("CRITICAL FIREBASE INITIALIZATION FAILED:", error.message);
        // Reset to null on failure
        app = null;
        db = null;
        storage = null;
        auth = null;
    }
}

// Export potentially null services. The app will crash upon usage, which is intended for debugging.
export { app, db, storage, auth, firebaseConfig };
