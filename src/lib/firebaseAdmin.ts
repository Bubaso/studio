
// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Initialize a variable to hold the initialized app.
let app: admin.app.App;

if (!admin.apps.length) {
  // Verify that the service account path is provided.
  if (!serviceAccountPath) {
    const errorMessage = 'CRITICAL_FIREBASE_ADMIN_INIT: The GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. The Admin SDK cannot be initialized. Ensure the .env file is set up correctly, the service account JSON file exists, and you have restarted your Next.js server.';
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  
  // Verify that the service account path is not a placeholder.
  if (serviceAccountPath.includes('REPLACE_WITH_')) {
    const errorMessage = `CRITICAL_FIREBASE_ADMIN_INIT: The GOOGLE_APPLICATION_CREDENTIALS path is still a placeholder ('${serviceAccountPath}'). Please update your .env file with the correct path to your service account JSON file.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    console.log(`ADMIN_SDK_INIT: Initializing with GOOGLE_APPLICATION_CREDENTIALS path: ${serviceAccountPath}`);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('CRITICAL_FIREBASE_ADMIN_INIT: Firebase Admin SDK initialization error:', error.message);
    console.error(
        'Ensure the GOOGLE_APPLICATION_CREDENTIALS environment variable points to a valid service account JSON file and that the file is correctly formatted.'
    );
    // Re-throw the error to make the failure explicit and prevent the server from starting.
    throw error;
  }
} else {
  app = admin.app();
  console.log('Using existing Firebase Admin SDK app instance.');
}

// Export the initialized services. If initialization failed, this part will not be reached.
export const adminDb = admin.firestore(app);
export const adminAuth = admin.auth(app);
export default admin;
