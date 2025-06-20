// src/app/api/messages/create-thread/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin'; // Import adminDb
import type { UserProfile, Item, MessageThread } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore'; // Use Admin SDK Timestamp


// Helper to convert Admin SDK Timestamp to ISO string
const convertAdminTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp; // Already ISO string
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  console.warn('Invalid admin timestamp format encountered:', timestamp);
  return new Date().toISOString();
};

const generateThreadIdInternal = (uid1: string, uid2: string): string => {
  if (!uid1 || !uid2) {
    throw new Error("UIDs cannot be empty for generating thread ID");
  }
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

async function getAdminUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists) return null;
  const data = userDoc.data() as UserProfile; // Assume data matches UserProfile structure
  return {
    ...data,
    uid: userDoc.id, // Ensure uid is set from doc id
    joinedDate: convertAdminTimestampToISO(data.joinedDate as any), // Firestore Admin might return its own Timestamp
  };
}

async function getAdminItemDetails(itemId: string): Promise<Item | null> {
  if (!itemId) return null;
  const itemDoc = await adminDb.collection('items').doc(itemId).get();
  if (!itemDoc.exists) return null;
  const data = itemDoc.data() as Item; // Assume data matches Item structure
  return {
    ...data,
    id: itemDoc.id,
    postedDate: convertAdminTimestampToISO(data.postedDate as any),
    lastUpdated: data.lastUpdated ? convertAdminTimestampToISO(data.lastUpdated as any) : undefined,
  };
}


export async function POST(request: NextRequest) {
  console.log('API_ROUTE: POST /api/messages/create-thread invoked.');
  if (!adminDb) {
    console.error('API_ROUTE_ERROR: Firebase Admin SDK (adminDb) is not initialized.');
    return NextResponse.json({ error: "Erreur critique de configuration du serveur (AdminDB). L'administrateur a été notifié." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { currentUserId, otherUserId, itemId } = body;
    console.log(`API_ROUTE_DATA: currentUserId=${currentUserId}, otherUserId=${otherUserId}, itemId=${itemId}`);

    if (!currentUserId || !otherUserId) {
      console.error('API_ROUTE_VALIDATION_ERROR: currentUserId or otherUserId is missing.');
      return NextResponse.json({ error: "Les identifiants utilisateurs (currentUserId, otherUserId) sont requis." }, { status: 400 });
    }
    if (currentUserId === otherUserId) {
      console.error('API_ROUTE_VALIDATION_ERROR: currentUserId and otherUserId are the same.');
      return NextResponse.json({ error: "Vous ne pouvez pas créer de fil de discussion avec vous-même." }, { status: 400 });
    }

    const threadId = generateThreadIdInternal(currentUserId, otherUserId);
    const threadRef = adminDb.collection('messageThreads').doc(threadId);
    console.log(`API_ROUTE_INFO: Generated threadId: ${threadId}. Thread ref path: ${threadRef.path}`);

    const threadSnap = await threadRef.get();
    console.log(`API_ROUTE_INFO: Fetched thread document. Exists: ${threadSnap.exists}`);

    let itemDetails: Item | null = null;
    if (itemId) {
      itemDetails = await getAdminItemDetails(itemId);
      console.log(`API_ROUTE_INFO: Fetched item details for itemId (${itemId}): ${itemDetails ? itemDetails.name : 'Not Found'}`);
    }

    if (!threadSnap.exists) {
      console.log(`API_ROUTE_ACTION: Thread ${threadId} does not exist. Creating new thread...`);
      const currentUserProfile = await getAdminUserProfile(currentUserId);
      const otherUserProfile = await getAdminUserProfile(otherUserId);

      if (!currentUserProfile) {
        console.error(`API_ROUTE_ERROR: Could not fetch profile for currentUserId: ${currentUserId}`);
        return NextResponse.json({ error: `Profil utilisateur actuel (ID: ${currentUserId}) introuvable.` }, { status: 404 });
      }
      if (!otherUserProfile) {
        console.error(`API_ROUTE_ERROR: Could not fetch profile for otherUserId: ${otherUserId}`);
        return NextResponse.json({ error: `Profil du vendeur (ID: ${otherUserId}) introuvable.` }, { status: 404 });
      }
       console.log(`API_ROUTE_INFO: Fetched currentUserProfile: ${currentUserProfile.name}, otherUserProfile: ${otherUserProfile.name}`);

      const participantUidsSorted: [string, string] = currentUserId < otherUserId ? [currentUserId, otherUserId] : [otherUserId, currentUserId];
      const namesSorted = participantUidsSorted[0] === currentUserId ? [currentUserProfile.name, otherUserProfile.name] : [otherUserProfile.name, currentUserProfile.name];
      const avatarsSorted = participantUidsSorted[0] === currentUserId ? [currentUserProfile.avatarUrl, otherUserProfile.avatarUrl] : [otherUserProfile.avatarUrl, currentUserProfile.avatarUrl];

      const newThreadData = {
        participantIds: participantUidsSorted,
        participantNames: [namesSorted[0] || 'Utilisateur', namesSorted[1] || 'Utilisateur'] as [string,string],
        participantAvatars: [avatarsSorted[0] || 'https://placehold.co/100x100.png?text=?', avatarsSorted[1] || 'https://placehold.co/100x100.png?text=?'] as [string,string],
        lastMessageAt: Timestamp.now(), // Admin SDK Timestamp
        createdAt: Timestamp.now(),     // Admin SDK Timestamp
        lastMessageText: itemDetails ? `Question à propos de "${itemDetails.name}"` : "Début de la conversation",
        lastMessageSenderId: '', // No message initially sent by this action itself
        itemId: itemDetails?.id || '',
        itemTitle: itemDetails?.name || '',
        itemImageUrl: itemDetails?.imageUrls?.[0] || '',
        itemSellerId: itemDetails?.sellerId || '',
      };

      await threadRef.set(newThreadData);
      console.log(`API_ROUTE_SUCCESS: New thread ${threadId} created.`);
      
      const createdThreadDocSnap = await threadRef.get(); // Re-fetch to get consistent data with timestamps
      const createdData = createdThreadDocSnap.data();
      if (!createdData) {
           console.error(`API_ROUTE_ERROR: Failed to re-fetch created thread ${threadId}.`);
           return NextResponse.json({ error: "Erreur lors de la récupération du fil de discussion nouvellement créé." }, { status: 500 });
      }

      return NextResponse.json({
        threadId: threadId,
        threadData: {
          id: threadId,
          ...createdData,
          createdAt: convertAdminTimestampToISO(createdData.createdAt as Timestamp),
          lastMessageAt: convertAdminTimestampToISO(createdData.lastMessageAt as Timestamp),
        },
      });

    } else {
      console.log(`API_ROUTE_ACTION: Thread ${threadId} already exists.`);
      const existingData = threadSnap.data() as MessageThread; // Cast for type safety
      let needsUpdate = false;
      const updatePayload: Partial<MessageThread> = {};

      if (itemDetails && (!existingData.itemId || existingData.itemId !== itemDetails.id)) {
        updatePayload.itemId = itemDetails.id;
        updatePayload.itemTitle = itemDetails.name;
        updatePayload.itemImageUrl = itemDetails.imageUrls?.[0];
        updatePayload.itemSellerId = itemDetails.sellerId;
        needsUpdate = true;
      }
      // Potentially update participant names/avatars if they changed
      // This requires fetching profiles even for existing threads, which can be added if necessary

      if (needsUpdate) {
        console.log(`API_ROUTE_ACTION: Updating item context for existing thread ${threadId} with payload:`, updatePayload);
        await threadRef.update(updatePayload);
        console.log(`API_ROUTE_SUCCESS: Updated item context for thread ${threadId}.`);
      }
      
      const finalThreadDataSnap = await threadRef.get(); // Re-fetch to get latest data
      const finalData = finalThreadDataSnap.data();
       if (!finalData) {
           console.error(`API_ROUTE_ERROR: Failed to re-fetch existing thread ${threadId} after potential update.`);
           return NextResponse.json({ error: "Erreur lors de la récupération du fil de discussion existant." }, { status: 500 });
      }


      return NextResponse.json({
        threadId: threadId,
        threadData: {
          id: threadId,
          ...finalData,
          createdAt: convertAdminTimestampToISO(finalData.createdAt as Timestamp),
          lastMessageAt: convertAdminTimestampToISO(finalData.lastMessageAt as Timestamp),
        },
      });
    }

  } catch (error: any) {
    console.error('API_ROUTE_UNEXPECTED_ERROR: An error occurred in POST /api/messages/create-thread:', error);
    // Log more details from the error object
    console.error(`API_ROUTE_UNEXPECTED_ERROR_DETAILS: Name: ${error.name}, Message: ${error.message}, Code: ${error.code}, Stack: ${error.stack}`);

    let clientErrorMessage = "Une erreur serveur inattendue s'est produite lors de la création du fil de discussion.";
    // No need to check for 'permission-denied' here if Admin SDK is used correctly,
    // as it bypasses rules. If such an error still occurs, it's a deeper config issue.
    if (error.message) {
        clientErrorMessage = `Erreur API: ${error.message}`;
    }
    return NextResponse.json({ error: clientErrorMessage }, { status: 500 });
  }
}
