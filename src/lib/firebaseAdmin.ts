
import * as admin from 'firebase-admin';
import { getApps, initializeApp, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminInstance: App;
let adminAuthInstance: Auth;
let adminDbInstance: Firestore;

const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

function initializeAdmin() {
    if (getApps().length > 0) {
        adminInstance = getApp();
    } else {
        const isConfigValid = serviceAccountJson && serviceAccountJson.trim() !== '' && !serviceAccountJson.includes('REPLACE_WITH');
        if (!isConfigValid) {
            throw new Error("CRITICAL: FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not set or is a placeholder.");
        }
        try {
            const serviceAccount = JSON.parse(serviceAccountJson);
            adminInstance = initializeApp({
                credential: admin.credential.cert(serviceAccount),
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            });
             console.log('Firebase Admin SDK initialized successfully.');
        } catch (error: any) {
            console.error('CRITICAL FIREBASE ADMIN INIT ERROR:', error.message);
            throw new Error('Could not initialize Firebase Admin SDK.');
        }
    }
    
    adminAuthInstance = getAuth(adminInstance);
    adminDbInstance = getFirestore(adminInstance);
}

// Initialize on first import.
try {
    initializeAdmin();
} catch (e) {
    console.error(e);
}

// Export the initialized instances
export const adminDb = adminDbInstance;
export const adminAuth = adminAuthInstance;
export { admin as initializedAdmin };
