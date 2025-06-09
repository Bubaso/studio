
'use server';

import { auth } from '@/lib/firebase';
import { createOrGetMessageThread as serviceCreateOrGetMessageThread } from '@/services/messageService';
import { getUserDocument } from '@/services/userService';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

export async function createOrGetThreadAndRedirect(currentUserId: string, otherUserId: string, itemId?: string) {
  if (!currentUserId || !otherUserId) {
    console.error("Action Error: User IDs are required.");
    // Consider returning an error object or throwing a more specific error
    // that the client can catch and display.
    return { error: "User IDs are required." };
  }
  if (currentUserId === otherUserId) {
    console.error("Action Error: Cannot create a thread with yourself.");
    return { error: "Cannot create a thread with yourself." };
  }

  try {
    const threadId = await serviceCreateOrGetMessageThread(currentUserId, otherUserId, itemId);
    if (threadId) {
      // Revalidate messages page to ensure new thread list is fetched if user navigates back
      revalidatePath('/messages');
      redirect(`/messages/${threadId}`);
      // Redirect doesn't return, so the return below is for type consistency if redirect fails or is removed.
      // However, redirect() throws an error to stop execution, so this path is unlikely.
      return { success: true, threadId }; 
    } else {
      console.error("Action Error: Failed to create or get message thread from service.");
      return { error: "Failed to create or get message thread." };
    }
  } catch (error) {
    console.error("Action Error in createOrGetThreadAndRedirect: ", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return { error: `Failed to process request: ${errorMessage}` };
  }
}
