
'use server';

import { revalidatePath } from 'next/cache';
import { getAdminInstances, incrementUserCounter } from '@/lib/firebaseAdmin';
import { sendWelcomeEmail } from '@/services/emailService';
import type { User as FirebaseUser } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';

// This is a Server Action that can be called from client components.
export async function createUserAction(
    firebaseUser: FirebaseUser,
    additionalData: { name?: string | null, avatarUrl?: string | null, location?: string | null } = {},
    locale: string = 'fr'
): Promise<{ success: boolean; error?: string }> {
    let adminAuth, adminDb;
    try {
        ({ auth: adminAuth, db: adminDb } = getAdminInstances());
    } catch (error: any) {
        console.error("SERVER ACTION ERROR: Firebase Admin SDK could not be initialized.", error.message);
        return { success: false, error: "Critical server configuration error." };
    }

    const uid = firebaseUser.uid;
    const userRef = adminDb.collection('users').doc(uid);

    try {
        const userDoc = await userRef.get();
        if (userDoc.exists) {
            console.log(`User document for ${uid} already exists. Skipping creation.`);
            return { success: true };
        }

        // Increment the user counter and determine if they are a founding member
        const { userCount, isFoundingMember } = await incrementUserCounter();
        const freeListings = isFoundingMember ? 15 : 5;

        // Prepare user data
        const finalName = additionalData.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous User';
        const finalAvatarUrl = additionalData.avatarUrl || firebaseUser.photoURL || `https://placehold.co/100x100.png?text=${finalName.substring(0, 2).toUpperCase()}`;

        const newUserDocData = {
            email: firebaseUser.email,
            name: finalName,
            avatarUrl: finalAvatarUrl,
            dataAiHint: "profil personne",
            joinedDate: admin.firestore.FieldValue.serverTimestamp(),
            location: additionalData.location || '',
            lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
            credits: 0,
            freeListingsRemaining: freeListings,
            subscriberCount: 0,
            subscriptionCount: 0,
            isFoundingMember: isFoundingMember,
        };

        // Create the user document in Firestore
        await userRef.set(newUserDocData);
        console.log(`Successfully created user document for ${uid}. Total users: ${userCount}`);

        // Send a welcome email
        if (firebaseUser.email) {
            await sendWelcomeEmail({ to: firebaseUser.email, name: finalName, locale });
        }

        // Ensure the Firebase Auth user record is consistent with the Firestore document
        if (finalName !== firebaseUser.displayName || finalAvatarUrl !== firebaseUser.photoURL) {
            await adminAuth.updateUser(uid, {
                displayName: finalName,
                photoURL: finalAvatarUrl
            });
        }
        
        revalidatePath('/');
        return { success: true };

    } catch (error: any) {
        console.error("Error in createUserAction:", error);
        return { success: false, error: error.message || "An unexpected error occurred during user creation." };
    }
}
