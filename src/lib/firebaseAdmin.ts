
import * as admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let adminDb: Firestore;
let adminAuth: Auth;
let initializedAdmin: typeof admin;

const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
const isConfigValid = serviceAccountJson && serviceAccountJson.trim() !== '' && !serviceAccountJson.includes('REPLACE_WITH');

if (getApps().length) {
    const app = admin.app();
    adminDb = getFirestore(app);
    adminAuth = getAuth(app);
    initializedAdmin = admin;
} else if (isConfigValid) {
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
        console.error('CRITICAL FIREBASE ADMIN INIT ERROR: Could not parse or initialize from FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON:', error.message);
    }
} else {
    console.error("CRITICAL FIREBASE ADMIN ERROR: FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not set or is a placeholder. Server-side Firebase features will be disabled.");
}

// @ts-ignore
export { adminDb, adminAuth, initializedAdmin };
