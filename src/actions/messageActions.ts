
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
      console.log(`ACTION: Thread found/created: ${result.threadId}. Attempting redirect...`);
      try {
        revalidatePath('/messages');
        redirect(`/messages/${result.threadId}`);
        // This part should not be reached if redirect is successful
      } catch (redirectError: any) {
        // If redirect itself fails in an unexpected way (other than NEXT_REDIRECT)
        console.error("ACTION: Error during revalidatePath or redirect: ", redirectError);
        if (redirectError.message === 'NEXT_REDIRECT') {
          throw redirectError; // Important: re-throw NEXT_REDIRECT
        }
        // For other errors during this phase, return a structured error
        return { error: `Échec de la redirection après la création du fil: ${redirectError.message || 'Erreur inconnue lors de la redirection'}` };
      }
    } else {
      const errorMessage = result.error || "Échec de la création ou de la récupération du fil de discussion.";
      console.error(`Action Error: serviceCreateOrGetMessageThread failed. UserID: ${currentUserId}, OtherUserID: ${otherUserId}, ItemID: ${itemId}. Reason: ${errorMessage}`);
      return { error: errorMessage };
    }
  } catch (error: any) {
    // Enhanced error logging
    console.error("[MESSAGE_ACTION_ERROR] Caught in createOrGetThreadAndRedirect:", {
      message: error.message,
      name: error.name,
      code: error.code, // For Firebase errors or others that might have a code
      stack: error.stack,
      // Attempt to serialize the full error if it's complex, avoiding circular refs if possible
      fullErrorString: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    });

    if (error.message === 'NEXT_REDIRECT') { // This is a special error Next.js throws for redirects
      throw error; // Re-throw for Next.js to handle
    }
    
    let clientErrorMessage = "Une erreur inattendue s'est produite lors du traitement de votre demande.";
    if (typeof error.message === 'string') {
        if (error.message.includes('permission-denied') || error.message.includes('Permission denied') || error.message.includes('Missing or insufficient permissions')) {
            clientErrorMessage = "Permissions Firestore insuffisantes. Veuillez vérifier vos règles de sécurité Firestore.";
        } else if (error.message.startsWith("SERVICE_") || error.message.includes(" requis") || error.message.includes("Vous ne pouvez pas créer de fil de discussion avec vous-même")) {
            // Pass through specific service/validation errors if they are user-friendly
            clientErrorMessage = error.message;
        } else {
            // For other generic errors, provide a user-friendly message but log the specific one.
            // The detailed error is already logged above.
            clientErrorMessage = `Échec du traitement de la demande. Veuillez réessayer.`;
        }
    }
    
    return { error: clientErrorMessage };
  }
}
