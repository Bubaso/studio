
'use server';

import { auth } from '@/lib/firebase';
import { createOrGetMessageThread as serviceCreateOrGetMessageThread } from '@/services/messageService';
import { getUserDocument } from '@/services/userService';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function createOrGetThreadAndRedirect(currentUserId: string, otherUserId: string, itemId?: string) {
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
    const result = await serviceCreateOrGetMessageThread(currentUserId, otherUserId, itemId);

    if (result.threadId) {
      // Revalidate messages page to ensure new thread list is fetched if user navigates back
      revalidatePath('/messages');
      redirect(`/messages/${result.threadId}`);
      // Redirect throws an error, so the return below is for type consistency if redirect fails or is removed.
      // However, redirect() throws an error to stop execution, so this path is unlikely.
      // return { success: true, threadId: result.threadId }; 
    } else {
      // Use the specific error from the service, or a generic one if undefined
      const errorMessage = result.error || "Échec de la création ou de la récupération du fil de discussion.";
      console.error(`Action Error: serviceCreateOrGetMessageThread failed. UserID: ${currentUserId}, OtherUserID: ${otherUserId}, ItemID: ${itemId}. Reason: ${errorMessage}`);
      return { error: errorMessage };
    }
  } catch (error: any) {
    console.error("Action Error in createOrGetThreadAndRedirect: ", error);

    // If the error is a Next.js redirect error, don't return an error message to client.
    if (error.message === 'NEXT_REDIRECT') {
      throw error; // Re-throw to let Next.js handle it
    }
    
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { error: `Échec du traitement de la demande: ${errorMessage}` };
  }
}
