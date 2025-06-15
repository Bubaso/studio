
'use server';

import { auth } from '@/lib/firebase';
import { createOrGetMessageThread as serviceCreateOrGetMessageThread } from '@/services/messageService';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// Top-level log to ensure this file is processed by Next.js runtime
console.log("GLOBAL LOG: src/actions/messageActions.ts is active and processed by Next.js.");

export async function createOrGetThreadAndRedirect(currentUserId: string, otherUserId: string, itemId?: string) {
  console.log("=====================================================");
  console.log("ACTION: createOrGetThreadAndRedirect === ACTION START ===");
  const serverAuthUid = auth.currentUser?.uid;
  console.log("ACTION: Server-side Firebase Auth UID (from firebase.ts global instance):", serverAuthUid || "auth.currentUser is NULL or has no UID");
  console.log("ACTION: Parameter currentUserId (passed from client):", currentUserId);
  console.log("ACTION: Parameter otherUserId (passed from client):", otherUserId);
  console.log("ACTION: Parameter itemId (passed from client):", itemId);
  console.log("-----------------------------------------------------");

  if (!currentUserId) {
    const errorMsg = "Action Validation Error: currentUserId (from client) is missing or empty.";
    console.error("ACTION_VALIDATION_FAIL:", errorMsg, { currentUserId, otherUserId, itemId });
    return { error: "Identifiant de l'utilisateur actuel manquant (paramètre client)." };
  }
  if (!otherUserId) {
    const errorMsg = "Action Validation Error: otherUserId (from client) is missing or empty.";
    console.error("ACTION_VALIDATION_FAIL:", errorMsg, { currentUserId, otherUserId, itemId });
    return { error: "Identifiant de l'autre utilisateur manquant (paramètre client)." };
  }
  if (currentUserId === otherUserId) {
    const errorMsg = "Action Validation Error: Cannot create a thread with yourself.";
    console.error("ACTION_VALIDATION_FAIL:", errorMsg, { currentUserId, otherUserId, itemId });
    return { error: "Vous ne pouvez pas créer de fil de discussion avec vous-même." };
  }

  // It's crucial that currentUserId (from client) is the one used for permission-sensitive operations
  // if serverAuthUid is unexpectedly null. Firestore rules will use request.auth.uid.
  // If serverAuthUid is null, it means the server action isn't running with Firebase user context.

  try {
    console.log("ACTION: TRY_BLOCK --- Attempting to call serviceCreateOrGetMessageThread...");
    const result = await serviceCreateOrGetMessageThread(currentUserId, otherUserId, itemId);
    console.log("ACTION: TRY_BLOCK --- serviceCreateOrGetMessageThread successfully returned:", JSON.stringify(result, null, 2));

    if (result.threadId && result.threadData) {
      console.log(`ACTION: TRY_BLOCK --- Thread operation successful. Thread ID: ${result.threadId}. Attempting redirect...`);
      revalidatePath('/messages'); // Ensure this path is correct if you use it.
      redirect(`/messages/${result.threadId}`);
      // Note: redirect() throws a NEXT_REDIRECT error, so code below this won't run if redirect is successful.
    } else {
      const errorMessage = result.error || "Échec de la création/récupération du fil de discussion (réponse du service).";
      console.error(`ACTION: TRY_BLOCK --- serviceCreateOrGetMessageThread indicate failure. UserID: ${currentUserId}, OtherUserID: ${otherUserId}, ItemID: ${itemId}. Reason: ${errorMessage}`);
      return { error: errorMessage };
    }
  } catch (error: any) {
    console.error("ACTION: CATCH_BLOCK --- An error was caught directly in createOrGetThreadAndRedirect:", {
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code,
      // errorStack: error.stack, // Stack trace can be very long, enable if needed
      errorFullDetails: JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
    });

    if (error.message === 'NEXT_REDIRECT') {
      console.log("ACTION: CATCH_BLOCK --- NEXT_REDIRECT error caught, re-throwing for Next.js to handle.");
      throw error; 
    }
    
    let clientErrorMessage = "Une erreur serveur inattendue s'est produite lors de la création de la discussion.";
    // Try to be more specific if it's a known Firebase permission error string from the caught error itself
    if (typeof error.message === 'string') {
        if (error.message.includes('permission-denied') || error.message.includes('Permission denied') || error.message.includes('Missing or insufficient permissions')) {
            clientErrorMessage = "Permissions Firestore insuffisantes. Veuillez vérifier vos règles de sécurité Firestore.";
        } else if (error.message.startsWith("SERVICE_") || error.message.includes(" requis") || error.message.includes("Vous ne pouvez pas créer de fil de discussion avec vous-même")) {
            clientErrorMessage = error.message; // Pass through specific service-level validation errors
        } else {
            // For other generic errors, provide a more direct but still user-friendly message.
            clientErrorMessage = `Échec du traitement de la demande: ${error.message || "Erreur serveur inconnue"}`;
        }
    }
    
    console.log("ACTION: CATCH_BLOCK --- Returning structured error to client:", { error: clientErrorMessage });
    console.log("ACTION: createOrGetThreadAndRedirect === ACTION END (ERROR PATH) ===");
    console.log("=====================================================");
    return { error: clientErrorMessage };
  }
  // This line should ideally not be reached if redirect() works as expected.
  console.log("ACTION: createOrGetThreadAndRedirect === ACTION END (UNEXPECTED PATH - post-try, should have redirected or returned error) ===");
  console.log("=====================================================");
  return { error: "Erreur de flux inattendue dans l'action serveur."};
}
    