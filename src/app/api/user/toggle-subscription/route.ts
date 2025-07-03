
import { NextResponse, type NextRequest } from 'next/server';
import admin, { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { createNotification } from '@/services/notificationService';
import type { UserProfile } from '@/lib/types';

export async function POST(request: NextRequest) {
  if (!adminDb || !adminAuth || !admin) {
    return NextResponse.json({ success: false, error: "Firebase Admin not configured." }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const idToken = authHeader.split('Bearer ')[1];
  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch (error) {
    return NextResponse.json({ success: false, error: "Invalid session." }, { status: 403 });
  }

  const currentUserId = decodedToken.uid;
  const { targetUserId } = await request.json();

  if (!targetUserId || currentUserId === targetUserId) {
    return NextResponse.json({ success: false, error: "Invalid target user ID." }, { status: 400 });
  }

  const currentUserRef = adminDb.collection('users').doc(currentUserId);
  const targetUserRef = adminDb.collection('users').doc(targetUserId);
  const subscriptionRef = currentUserRef.collection('subscriptions').doc(targetUserId);
  const subscriberRef = targetUserRef.collection('subscribers').doc(currentUserId);

  try {
    const currentUserSnap = await currentUserRef.get();
    if (!currentUserSnap.exists()) {
        return NextResponse.json({ success: false, error: "Current user profile not found." }, { status: 404 });
    }
    const currentUserProfile = currentUserSnap.data() as UserProfile;


    let isSubscribed = false;
    await adminDb.runTransaction(async (transaction) => {
      const subscriptionDoc = await transaction.get(subscriptionRef);
      const isCurrentlySubscribed = subscriptionDoc.exists;

      if (isCurrentlySubscribed) {
        // Unsubscribe
        transaction.delete(subscriptionRef);
        transaction.delete(subscriberRef);
        transaction.update(currentUserRef, { subscriptionCount: admin.firestore.FieldValue.increment(-1) });
        transaction.update(targetUserRef, { subscriberCount: admin.firestore.FieldValue.increment(-1) });
        isSubscribed = false;
      } else {
        // Subscribe
        transaction.set(subscriptionRef, { subscribedAt: admin.firestore.FieldValue.serverTimestamp() });
        transaction.set(subscriberRef, { subscribedAt: admin.firestore.FieldValue.serverTimestamp() });
        transaction.update(currentUserRef, { subscriptionCount: admin.firestore.FieldValue.increment(1) });
        transaction.update(targetUserRef, { subscriberCount: admin.firestore.FieldValue.increment(1) });
        isSubscribed = true;
      }
    });

    if (isSubscribed) {
        await createNotification(targetUserId, {
            type: 'new_subscriber',
            relatedUserId: currentUserId,
            relatedUserName: currentUserProfile.name || 'Un utilisateur',
            relatedUserAvatar: currentUserProfile.avatarUrl || undefined,
        });
    }

    return NextResponse.json({ success: true, isSubscribed });
  } catch (error: any) {
    console.error("Error in toggle-subscription API:", error);
    return NextResponse.json({ success: false, error: "An error occurred. Please try again." }, { status: 500 });
  }
}
