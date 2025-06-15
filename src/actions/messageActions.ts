
'use server';

import { auth } from '@/lib/firebase';
import { createOrGetMessageThread as serviceCreateOrGetMessageThread } from '@/services/messageService';
import { getUserDocument } from '@/services/userService';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function createOrGetThreadAndRedirect(currentUserId: string, otherUserId: string, itemId?: string) {
  console.log("ACTION: createOrGetThreadAndRedirect called");
  console.log("ACTION: currentUserId:", currentUserId);
  console.log("ACTION: otherUserId:", otherUserId);
  console.log("ACTION: itemId:", itemId);

  // Note: In Server Actions, auth.currentUser from the client-side SDK might not be directly available or reliable in the same way.
  // Firebase Admin SDK (if used on a backend server) or the context provided by Next.js to server actions for auth is what matters for Firestore rules.
  // For now, we assume currentUserId is correctly passed from an authenticated client context.

  if (!currentUserId || !otherUserId) {
    const msg = "Action Error: User IDs are required.";
    console.error(msg, { currentUserId, otherUserId });
    return { error: "Les identifiants utilisateurs sont requis." };
  }
  if (currentUserId === otherUserId) {
    const msg = "Action Error: Cannot create a thread with yourself.";
    console.error(msg, { currentUserId, otherUserId });
    return { error: "Vous ne pouvez pas créer de fil de discussion avec vous-même." };
  }

  try {
    console.log("ACTION: Calling serviceCreateOrGetMessageThread...");
    const result = await serviceCreateOrGetMessageThread(currentUserId, otherUserId, itemId);
    console.log("ACTION: serviceCreateOrGetMessageThread result:", JSON.stringify(result, null, 2));

    if (result.threadId && result.threadData) {
      console.log(`ACTION: Thread found/created: ${result.threadId}. Redirecting...`);
      revalidatePath('/messages');
      redirect(`/messages/${result.threadId}`);
      // Redirect throws an error, so the return below is for type consistency if redirect fails or is removed.
      // return { success: true, threadId: result.threadId, thread: result.threadData }; 
    } else {
      const errorMessage = result.error || "Échec de la création ou de la récupération du fil de discussion.";
      console.error(`Action Error: serviceCreateOrGetMessageThread failed. UserID: ${currentUserId}, OtherUserID: ${otherUserId}, ItemID: ${itemId}. Reason: ${errorMessage}`);
      return { error: errorMessage };
    }
  } catch (error: any) {
    console.error("Action Error in createOrGetThreadAndRedirect: ", error);

    if (error.message === 'NEXT_REDIRECT') {
      throw error; 
    }
    
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    // Specific check for permission denied from Firestore, if possible to identify.
    if (typeof error.message === 'string' && (error.message.includes('permission-denied') || error.message.includes('Permission denied') || error.message.includes('Missing or insufficient permissions'))) {
        console.error("ACTION: Firestore permission denied detected in createOrGetThreadAndRedirect catch block.");
        return { error: "Permissions Firestore insuffisantes. Veuillez vérifier vos règles de sécurité Firestore." };
    }
    return { error: `Échec du traitement de la demande: ${errorMessage}` };
  }
}

