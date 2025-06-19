
'use server';

// This Server Action is being replaced by an API route using Firebase Admin SDK
// for the "Contacter le vendeur" functionality.
// It's kept here temporarily for reference or if other parts of the app might use it,
// but should be phased out or refactored if its specific Server Action redirect behavior
// is needed elsewhere.

// import { createOrGetMessageThread as serviceCreateOrGetMessageThread } from '@/services/messageService';
// import { redirect } from 'next/navigation';
// import { revalidatePath } from 'next/cache';
// import { auth } from '@/lib/firebase'; 

// console.log("GLOBAL LOG: src/actions/messageActions.ts is active and processed by Next.js.");

// export async function createOrGetThreadAndRedirect(currentUserId: string, otherUserId: string, itemId?: string) {
//   console.log("=====================================================");
//   console.log("SERVER_ACTION: createOrGetThreadAndRedirect called (but is being deprecated for API route)");
//   console.log("SERVER_ACTION: Parameter currentUserId (passed from client):", currentUserId);
//   console.log("SERVER_ACTION: Parameter otherUserId (passed from client):", otherUserId);
//   console.log("SERVER_ACTION: Parameter itemId (passed from client):", itemId);
//   console.log("-----------------------------------------------------");

//   // For now, this action will return an error indicating it's deprecated.
//   return { error: "This server action is deprecated. Please use the API route." };

  // ... (previous Server Action logic commented out or removed) ...
// }
    
// If you need other message-related server actions, they can remain here.
// For example, if you had an action to delete a message (though that's usually client-side with rules).
// For now, this file can be mostly empty or just contain this comment.
export {}; // Add this to make it a module if all content is removed/commented.

