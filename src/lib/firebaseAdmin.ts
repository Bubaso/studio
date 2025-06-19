// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

// IMPORTANT: Path to your Firebase Admin SDK service account key JSON file.
// Download this from Firebase Console: Project settings > Service accounts > Generate new private key.
// Store this file securely and DO NOT commit it to your repository.
//
// Set the GOOGLE_APPLICATION_CREDENTIALS environment variable to the path of this file.
// For local development, create a .env.local file in your project root and add:
// GOOGLE_APPLICATION_CREDENTIALS="./your-service-account-key-filename.json"
// (Replace with the actual path and filename of your key)
// Ensure .env.local and the key file itself are in your .gitignore.

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!admin.apps.length) {
  if (!serviceAccountPath) {
    console.error(
      'CRITICAL_FIREBASE_ADMIN_INIT: Firebase Admin SDK service account path (GOOGLE_APPLICATION_CREDENTIALS) is not set.' +
      ' The Admin SDK cannot be initialized. Ensure the .env.local file is set up correctly, ' +
      'the service account JSON file exists at the specified path, and you have restarted your Next.js server.'
    );
    // Depending on your deployment, you might want to throw an error here or handle it gracefully.
    // For now, it will log, and dependent services might fail.
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
        // If you use Firebase Realtime Database, you might also need:
        // databaseURL: `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebaseio.com`
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error: any) {
      console.error('CRITICAL_FIREBASE_ADMIN_INIT: Firebase Admin SDK initialization error:', error.message);
      console.error('Stack:', error.stack);
      console.error(
          'Ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable points to a valid service account JSON file.'
      );
    }
  }
}

let adminDbInstance, adminAuthInstance;

if (admin.apps.length) {
    adminDbInstance = admin.firestore();
    adminAuthInstance = admin.auth();
} else {
    // Provide non-functional stubs or handle the uninitialized state appropriately
    // to prevent crashes if other parts of the app import these before full init.
    console.warn("Firebase Admin SDK not initialized. adminDb and adminAuth will not be functional.");
    adminDbInstance = null; // Or some stub object
    adminAuthInstance = null; // Or some stub object
}


export const adminDb = adminDbInstance;
export const adminAuth = adminAuthInstance;
export default admin;
