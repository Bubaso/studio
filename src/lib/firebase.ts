
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
} else {
  // console.log("Firebase Init: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID is not set."); // Optional: keep if you want to be reminded
}

// Initialize Firebase
let app;
if (getApps().length === 0) {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    console.error("Firebase Init Error: Critical configuration (apiKey, authDomain, projectId) is missing. These values should be provided by environment variables (e.g., process.env.NEXT_PUBLIC_FIREBASE_API_KEY).");
    // Potentially throw an error or handle this state if critical for the app to function
  }
  app = initializeApp(firebaseConfig);
  // console.log("Firebase app initialized successfully."); // Optional: confirm initialization
} else {
  app = getApp();
  // console.log("Firebase app retrieved successfully."); // Optional: confirm retrieval
}

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth, firebaseConfig };
