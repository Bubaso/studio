
'use server';

import { revalidatePath } from 'next/cache';
import { getAdminInstances, incrementUserCounter } from '@/lib/firebaseAdmin';
import { sendWelcomeEmail } from '@/services/emailService';
import * as admin from 'firebase-admin';

/**
 * A serializable user object containing only the necessary data from the client.
 */
export interface SerializableUser {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
}


// This is a Server Action that can be called from client components.
export async function createUserAction(
    serializableUser: SerializableUser,
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

    const uid = serializableUser.uid;
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
        const finalName = additionalData.name || serializableUser.displayName || serializableUser.email?.split('@')[0] || 'Anonymous User';
        const finalAvatarUrl = additionalData.avatarUrl || serializableUser.photoURL || `https://placehold.co/100x100.png?text=${finalName.substring(0, 2).toUpperCase()}`;

        const newUserDocData = {
            email: serializableUser.email,
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
        if (serializableUser.email) {
            await sendWelcomeEmail({ to: serializableUser.email, name: finalName, locale });
        }

        // Ensure the Firebase Auth user record is consistent with the Firestore document
        const authUser = await adminAuth.getUser(uid);
        if (finalName !== authUser.displayName || finalAvatarUrl !== authUser.photoURL) {
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
