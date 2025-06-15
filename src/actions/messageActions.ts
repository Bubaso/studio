
'use server';

import { createOrGetMessageThread as serviceCreateOrGetMessageThread } from '@/services/messageService';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// Top-level log to ensure this file is processed by Next.js runtime
console.log("GLOBAL LOG: src/actions/messageActions.ts is active and processed by Next.js.");

export async function createOrGetThreadAndRedirect(currentUserId: string, otherUserId: string, itemId?: string) {
  console.log("=====================================================");
  console.log("ACTION: createOrGetThreadAndRedirect === ACTION START ===");
  console.log("ACTION: Parameter currentUserId (passed from client):", currentUserId);
  console.log("ACTION: Parameter otherUserId (passed from client):", otherUserId);
  console.log("ACTION: Parameter itemId (passed from client):", itemId);
  console.log("-----------------------------------------------------");

  // Client-provided UIDs are validated
  if (!currentUserId) {
    console.error("ACTION_VALIDATION_FAIL: currentUserId is missing or empty.");
    return { error: "Identifiant de l'utilisateur actuel manquant." };
  }
  if (!otherUserId) {
    console.error("ACTION_VALIDATION_FAIL: otherUserId is missing or empty.");
    return { error: "Identifiant de l'autre utilisateur manquant." };
  }
  if (currentUserId === otherUserId) {
    console.error("ACTION_VALIDATION_FAIL: Cannot create a thread with yourself.");
    return { error: "Vous ne pouvez pas créer de fil de discussion avec vous-même." };
  }

  try {
    console.log("ACTION: TRY_BLOCK --- Attempting to call serviceCreateOrGetMessageThread with:", { currentUserId, otherUserId, itemId });
    // Corrected variable from otherUserUid to otherUserId
    const result = await serviceCreateOrGetMessageThread(currentUserId, otherUserId, itemId); 
    console.log("ACTION: TRY_BLOCK --- serviceCreateOrGetMessageThread successfully returned:", JSON.stringify(result, null, 2));

    if (result.threadId && result.threadData) {
      console.log(`ACTION: TRY_BLOCK --- Thread operation successful. Thread ID: ${result.threadId}. Attempting redirect...`);
      revalidatePath('/messages'); 
      redirect(`/messages/${result.threadId}`);
      // Note: redirect() throws an error that Next.js handles, so code after it might not run.
    } else {
      const errorMessage = result.error || "Échec de la création/récupération du fil de discussion (réponse du service).";
      console.error(`ACTION: TRY_BLOCK --- serviceCreateOrGetMessageThread indicate failure. UserID: ${currentUserId}, OtherUserID: ${otherUserId}, ItemID: ${itemId}. Reason: ${errorMessage}`);
      return { error: errorMessage };
    }
  } catch (error: any) {
    console.error("[MESSAGE_ACTION_ERROR] An error was caught directly in createOrGetThreadAndRedirect:", {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code,
      errorFullDetails: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
      errorStack: error.stack // Log the stack for more detailed debugging
    });

    if (error.message === 'NEXT_REDIRECT') {
      console.log("ACTION: CATCH_BLOCK --- NEXT_REDIRECT error caught, re-throwing for Next.js to handle.");
      throw error; 
    }
    
    let clientErrorMessage = "Une erreur serveur inattendue s'est produite lors de la création de la discussion.";
    if (typeof error.message === 'string') {
        // Check for permission-denied related messages from the service layer or Firestore directly
        if (error.message.includes('permission-denied') || error.message.includes('Permission denied') || error.message.includes('Missing or insufficient permissions') || error.message.includes("Permissions Firestore insuffisantes")) {
            clientErrorMessage = "Permissions Firestore insuffisantes. Veuillez vérifier vos règles de sécurité Firestore.";
        } else if (error.message.startsWith("SERVICE_") || error.message.includes(" requis") || error.message.includes("Vous ne pouvez pas créer de fil de discussion avec vous-même")) {
            clientErrorMessage = error.message; // Pass service-level validation errors directly
        }
    }
    
    console.log("ACTION: CATCH_BLOCK --- Returning structured error to client:", { error: clientErrorMessage });
    console.log("ACTION: createOrGetThreadAndRedirect === ACTION END (ERROR PATH) ===");
    console.log("=====================================================");
    return { error: clientErrorMessage };
  }
}
