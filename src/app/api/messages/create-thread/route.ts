// src/app/api/messages/create-thread/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createOrGetMessageThread as serviceCreateOrGetMessageThread } from '@/services/messageService';
import { adminDb } from '@/lib/firebaseAdmin'; // Import adminDb to ensure Admin SDK is initialized

export async function POST(request: NextRequest) {
  if (!adminDb) { // Check if Admin SDK initialized properly
    console.error('API_CREATE_THREAD_ERROR: Firebase Admin SDK not initialized. Cannot process request.');
    return NextResponse.json({ error: "Erreur de configuration du serveur. Veuillez réessayer plus tard." }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { currentUserId, otherUserId, itemId } = body;

    if (!currentUserId || !otherUserId) {
      return NextResponse.json({ error: "Les identifiants utilisateurs (currentUserId, otherUserId) sont requis." }, { status: 400 });
    }
    if (currentUserId === otherUserId) {
      return NextResponse.json({ error: "Vous ne pouvez pas créer de fil de discussion avec vous-même." }, { status: 400 });
    }
    
    // In a production app with Firebase Admin SDK, you would typically get the
    // currentUserId by verifying a Firebase ID token sent from the client.
    // For example:
    // const authorization = request.headers.get('Authorization');
    // if (authorization?.startsWith('Bearer ')) {
    //   const idToken = authorization.split('Bearer ')[1];
    //   try {
    //     const decodedToken = await adminAuth.verifyIdToken(idToken);
    //     // currentUserId = decodedToken.uid; // This would be the trusted UID
    //   } catch (error) {
    //     console.error('API_CREATE_THREAD_ERROR: Invalid Firebase ID token:', error);
    //     return NextResponse.json({ error: "Authentification invalide." }, { status: 401 });
    //   }
    // } else {
    //   return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    // }
    // For now, we are trusting currentUserId passed from client, similar to the Server Action.

    console.log(`API_CREATE_THREAD: Received request with currentUserId: ${currentUserId}, otherUserId: ${otherUserId}, itemId: ${itemId}`);

    const result = await serviceCreateOrGetMessageThread(currentUserId, otherUserId, itemId);

    if (result.threadId && result.threadData) {
      console.log(`API_CREATE_THREAD: Thread operation successful. Thread ID: ${result.threadId}`);
      return NextResponse.json({ threadId: result.threadId, threadData: result.threadData });
    } else {
      console.error(`API_CREATE_THREAD_ERROR: Service returned error. Reason: ${result.error}`);
      return NextResponse.json({ error: result.error || "Échec de la création/récupération du fil de discussion." }, { status: 500 });
    }

  } catch (error: any) {
    console.error('API_CREATE_THREAD_UNEXPECTED_ERROR:', error);
    let clientErrorMessage = "Une erreur serveur inattendue s'est produite.";
    if (error.message && (error.message.includes('permission-denied') || error.message.includes('Permission denied'))) {
        clientErrorMessage = "Permissions Firestore insuffisantes (côté API). Vérifiez la configuration du SDK Admin.";
    }
    return NextResponse.json({ error: clientErrorMessage }, { status: 500 });
  }
}
