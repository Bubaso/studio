
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Only add measurementId if it's set in the environment variables
if (process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
  firebaseConfig.measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
}

// Initialize Firebase
let app;
let db;
let storage;
let auth;

try {
  // Check for placeholder values from the .env template
  const isConfigPlaceholder = (value: string | undefined) => value?.includes('REPLACE_WITH');

  if (
    !firebaseConfig.apiKey || isConfigPlaceholder(firebaseConfig.apiKey as string) ||
    !firebaseConfig.authDomain || isConfigPlaceholder(firebaseConfig.authDomain as string) ||
    !firebaseConfig.projectId || isConfigPlaceholder(firebaseConfig.projectId as string)
  ) {
    const errorMessage = "Firebase Init Error: Critical configuration (apiKey, authDomain, projectId) is missing or contains placeholder values. Please check your .env file and ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set with your project credentials.";
    console.error(errorMessage);
    // Make the error fatal to prevent the server from starting in a broken state.
    throw new Error(errorMessage);
  }

  if (getApps().length === 0) {
    console.log("Initializing new Firebase app...");
    app = initializeApp(firebaseConfig);
  } else {
    console.log("Getting existing Firebase app...");
    app = getApp();
  }

  if (app) {
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    console.log("Firestore, Storage, and Auth services initialized successfully.");
  } else {
    const appInitErrorMessage = "Firebase Init Error: Firebase app object could not be initialized or retrieved. This is a critical issue.";
    console.error(appInitErrorMessage);
    throw new Error(appInitErrorMessage);
  }

} catch (error: any) {
  console.error("CRITICAL FIREBASE INITIALIZATION FAILED:", error.message);
  // Re-throw the error to ensure the Next.js server fails loudly and clearly.
  throw error;
}


export { app, db, storage, auth, firebaseConfig };
