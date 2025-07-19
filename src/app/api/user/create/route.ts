import { NextResponse, type NextRequest } from 'next/server';
import { getAdminInstances, incrementUserCounter } from '@/lib/firebaseAdmin';
import { sendWelcomeEmail } from '@/services/emailService';
import type { User as FirebaseUser } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
  let adminAuth, adminDb;
  try {
    ({ auth: adminAuth, db: adminDb } = getAdminInstances());
  } catch (error: any) {
    console.error("API CREATE USER - FAILED TO INIT ADMIN:", error.message);
    return NextResponse.json({ success: false, error: "Configuration du serveur Firebase Admin manquante." }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 });
  }

  const idToken = authHeader.split('Bearer ')[1];
  let decodedToken: FirebaseUser;
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken) as FirebaseUser;
  } catch (error) {
    console.error('API CREATE USER: Invalid ID token', error);
    return NextResponse.json({ success: false, error: 'Session invalide ou expirée.' }, { status: 403 });
  }

  const { additionalData = {}, locale = 'fr' } = await request.json();
  const uid = decodedToken.uid;
  const userRef = adminDb.collection('users').doc(uid);

  try {
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      console.log(`User document for ${uid} already exists. Skipping creation.`);
      return NextResponse.json({ success: true, message: "User already exists." });
    }

    const { userCount, isFoundingMember } = await incrementUserCounter();
    const freeListings = isFoundingMember ? 15 : 5;

    const finalName = additionalData.name || decodedToken.name || decodedToken.email?.split('@')[0] || 'Utilisateur Anonyme';
    const finalAvatarUrl = additionalData.avatarUrl || decodedToken.picture || `https://placehold.co/100x100.png?text=${finalName.substring(0, 2).toUpperCase()}`;

    const newUserDocData = {
      email: decodedToken.email,
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

    await userRef.set(newUserDocData);

    console.log(`Successfully created user document for ${uid}. Total users: ${userCount}`);
    
    if (decodedToken.email) {
      await sendWelcomeEmail({ to: decodedToken.email, name: finalName, locale });
    }

    // Also update the Auth user record with the final name/avatar if they differ
    if (finalName !== decodedToken.name || finalAvatarUrl !== decodedToken.picture) {
        await adminAuth.updateUser(uid, {
            displayName: finalName,
            photoURL: finalAvatarUrl
        });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Error in create user API route:", error);
    return NextResponse.json({ success: false, error: error.message || "An unexpected error occurred." }, { status: 500 });
  }
}
