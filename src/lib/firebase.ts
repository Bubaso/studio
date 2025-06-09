
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
  if (
    !firebaseConfig.apiKey ||
    !firebaseConfig.authDomain ||
    !firebaseConfig.projectId
  ) {
    const errorMessage = "Firebase Init Error: Critical configuration (apiKey, authDomain, projectId) is missing. These values should be provided by environment variables (e.g., process.env.NEXT_PUBLIC_FIREBASE_API_KEY). Ensure your .env file is correctly set up and prefixed with NEXT_PUBLIC_ and that you have restarted your Next.js development server.";
    console.error(errorMessage);
    // Bu noktada bir hata fırlatmak, sunucu tarafında bir sorun olduğunda daha belirgin olabilir.
    // Ancak, Next.js'in bu hatayı nasıl ele alacağı uygulamadan uygulamaya değişebilir.
    // Şimdilik sadece logluyoruz, ama bir sonraki adımda hata fırlatmayı düşünebiliriz.
    // throw new Error(errorMessage); 
  }

  if (getApps().length === 0) {
    console.log("Initializing new Firebase app...");
    app = initializeApp(firebaseConfig);
    console.log("Firebase app initialized successfully.");
  } else {
    console.log("Getting existing Firebase app...");
    app = getApp();
    console.log("Existing Firebase app retrieved.");
  }

  if (app) {
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    console.log("Firestore, Storage, and Auth services initialized.");
  } else {
    const appInitErrorMessage = "Firebase Init Error: Firebase app object could not be initialized or retrieved. This is a critical issue.";
    console.error(appInitErrorMessage);
    // throw new Error(appInitErrorMessage);
  }

} catch (error: any) {
  console.error("CRITICAL FIREBASE INITIALIZATION FAILED:", error.message);
  console.error("Full error object:", error);
  // throw error; // Hatanın daha yukarıya fırlatılması, Next.js'in bunu yakalamasına yardımcı olabilir.
}


export { app, db, storage, auth, firebaseConfig };
