

// Can be called from client components if needed, though actions are preferred for mutations

import { db, storage, auth } from '@/lib/firebase'; // Added auth
import type { Message, MessageThread, UserProfile, Item } from '@/lib/types';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  writeBatch,
  limit,
  deleteField,
  arrayRemove,
  runTransaction
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getUserDocument } from './userService';
import { getItemByIdFromFirestore } from './itemService'; // To fetch item details

const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
    try {
      return (timestamp as Timestamp).toDate().toISOString();
    } catch (e) {
      console.warn('Error converting timestamp toDate:', timestamp, e);
      return new Date().toISOString();
    }
  }
  console.warn('Invalid timestamp format encountered in messageService:', timestamp);
  return new Date().toISOString();
};

export const uploadChatImageAndGetURL = async (file: File, threadId: string, userId: string): Promise<string> => {
  console.log('CLIENT_STORAGE_UPLOAD: Initiating uploadChatImageAndGetURL');
  console.log('CLIENT_STORAGE_UPLOAD: File Name:', file.name, 'File Size:', file.size, 'File Type:', file.type);
  console.log('CLIENT_STORAGE_UPLOAD: Thread ID:', threadId);
  console.log('CLIENT_STORAGE_UPLOAD: User ID (for path):', userId);

  if (!file || !threadId || !userId) {
    const errorMsg = "File, thread ID, and user ID are required for chat image upload.";
    console.error('CLIENT_STORAGE_UPLOAD_ERROR:', errorMsg, { fileExists: !!file, threadId, userId });
    throw new Error(errorMsg);
  }

  const currentFirebaseUser = auth.currentUser;
  if (!currentFirebaseUser) {
    console.error('CLIENT_STORAGE_UPLOAD_ERROR: Firebase auth.currentUser is null. User not authenticated client-side for storage upload.');
    throw new Error("User not authenticated. Cannot upload image.");
  }
  if (currentFirebaseUser.uid !== userId) {
    console.error('CLIENT_STORAGE_UPLOAD_ERROR: Mismatch between provided userId and auth.currentUser.uid.', { providedUserId: userId, authUid: currentFirebaseUser.uid });
    throw new Error("User ID mismatch during image upload authentication.");
  } else {
    console.log('CLIENT_STORAGE_UPLOAD: auth.currentUser.uid matches provided userId:', currentFirebaseUser.uid);
  }


  const uniqueFileName = `${Date.now()}_${file.name}`;
  const imagePath = `chatAttachments/${threadId}/${userId}/${uniqueFileName}`;
  console.log('CLIENT_STORAGE_UPLOAD: Constructed Storage Path:', imagePath);

  const imageRef = storageRef(storage, imagePath);

  try {
    console.log('CLIENT_STORAGE_UPLOAD: Attempting to uploadBytes to path:', imagePath);
    const snapshot = await uploadBytes(imageRef, file);
    console.log('CLIENT_STORAGE_UPLOAD: Upload successful. Snapshot ref path:', snapshot.ref.fullPath);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('CLIENT_STORAGE_UPLOAD: Successfully got download URL:', downloadURL);
    return downloadURL;
  } catch (error: any) {
    console.error("CLIENT_STORAGE_UPLOAD_ERROR: Error during Firebase Storage operation (uploadBytes or getDownloadURL).", 
                  { errorName: error.name, errorCode: error.code, errorMessage: error.message, fullErrorObject: error });
    throw error; 
  }
};

export const uploadChatAudioAndGetURL = async (audioBlob: Blob, threadId: string, userId: string): Promise<string> => {
  if (!audioBlob || !threadId || !userId) {
    throw new Error("Audio blob, thread ID, and user ID are required for chat audio upload.");
  }

  const currentFirebaseUser = auth.currentUser;
  if (!currentFirebaseUser || currentFirebaseUser.uid !== userId) {
    throw new Error("User not authenticated or mismatched. Cannot upload audio.");
  }
  
  const uniqueFileName = `audio_${Date.now()}.webm`;
  const audioPath = `chatAttachments/${threadId}/${userId}/${uniqueFileName}`;
  const audioFileRef = storageRef(storage, audioPath);

  try {
    const snapshot = await uploadBytes(audioFileRef, audioBlob);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading chat audio:", error);
    throw error;
  }
};


interface SendMessageParams {
  senderId: string;
  recipientId: string;
  itemId: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
}

const generateThreadId = (uid1: string, uid2: string): string => {
  if (!uid1 || !uid2) {
    throw new Error("UIDs cannot be empty for generating thread ID");
  }
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

export const sendMessage = async ({ senderId, recipientId, itemId, text, imageUrl, audioUrl }: SendMessageParams): Promise<{ threadId: string }> => {
  const isJustCreatingThread = !text && !imageUrl && !audioUrl;
  if (!senderId || !recipientId || !itemId) {
    throw new Error("Sender, recipient, and item IDs are required.");
  }

  const threadId = generateThreadId(senderId, recipientId);
  const threadRef = doc(db, 'messageThreads', threadId);

  try {
    await runTransaction(db, async (transaction) => {
      const threadSnap = await transaction.get(threadRef);
      const itemDetails = await getItemByIdFromFirestore(itemId);

      if (!itemDetails) {
        throw new Error("L'article en question n'a pas été trouvé.");
      }
      
      let lastMessagePreview = text.trim();
      if (audioUrl) {
          lastMessagePreview = "🎤 Message vocal";
      } else if (imageUrl) {
          lastMessagePreview = text.trim() ? `📷 ${text.trim()}` : "📷 Image";
      }

      if (!threadSnap.exists()) {
        const senderProfile = await getUserDocument(senderId);
        const recipientProfile = await getUserDocument(recipientId);

        if (!senderProfile || !recipientProfile) {
          throw new Error("Impossible de trouver le profil de l'utilisateur.");
        }
        
        const participantIdsSorted: [string, string] = senderId < recipientId ? [senderId, recipientId] : [recipientId, senderId];
        const namesSorted = participantIdsSorted[0] === senderId ? [senderProfile.name, recipientProfile.name] : [recipientProfile.name, senderProfile.name];
        const avatarsSorted = participantIdsSorted[0] === senderId ? [senderProfile.avatarUrl, recipientProfile.avatarUrl] : [otherProfile.avatarUrl, senderProfile.avatarUrl];

        const newThreadData = {
          participantIds: participantIdsSorted,
          participantNames: [namesSorted[0] || 'Utilisateur', namesSorted[1] || 'Utilisateur'] as [string, string],
          participantAvatars: [avatarsSorted[0] || 'https://placehold.co/100x100.png?text=?', avatarsSorted[1] || 'https://placehold.co/100x100.png?text=?'] as [string, string],
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          discussedItemIds: [itemId],
        };
        transaction.set(threadRef, newThreadData);
      } else {
        const updatePayload: { [key: string]: any } = {
            discussedItemIds: arrayUnion(itemId),
            lastMessageAt: serverTimestamp(),
            deletedFor: arrayRemove(senderId) // Undelete for sender if they send a message
        };
        transaction.update(threadRef, updatePayload);
      }
      
      if (!isJustCreatingThread) {
          const messagesColRef = collection(threadRef, 'messages');
          const newMsgDocRef = doc(messagesColRef);
          
          const newMessageData: Omit<Message, 'id' | 'timestamp'> & { timestamp: any } = {
            threadId,
            senderId,
            senderName: (await getUserDocument(senderId))?.name || "Utilisateur Inconnu",
            text: text.trim(),
            itemId,
            timestamp: serverTimestamp(),
            readBy: [senderId],
          };
          if (imageUrl) newMessageData.imageUrl = imageUrl;
          if (audioUrl) newMessageData.audioUrl = audioUrl;

          transaction.set(newMsgDocRef, newMessageData);

          const threadUpdateWithMessage = {
              lastMessageText: lastMessagePreview,
              lastMessageSenderId: senderId,
              participantsWhoHaveSeenLatest: [senderId],
              itemId: itemDetails.id,
              itemTitle: itemDetails.name,
              itemImageUrl: itemDetails.imageUrls?.[0] || '',
              itemSellerId: itemDetails.sellerId,
              [`unreadItemsFor.${recipientId}`]: arrayUnion(itemId),
              deletedFor: arrayRemove(recipientId) // Undelete for receiver
          };
          transaction.update(threadRef, threadUpdateWithMessage);
      }
    });

    return { threadId };
  } catch (error) {
    console.error("Error in sendMessage transaction: ", error);
    throw error;
  }
};


export const getMessageThreadsForUser = (
  userUid: string,
  onUpdate: (threads: MessageThread[]) => void
): Unsubscribe => {
  if (!userUid) {
    console.warn("getMessageThreadsForUser called with no userUid.");
    onUpdate([]);
    return () => {};
  }
  const threadsQuery = query(
    collection(db, 'messageThreads'),
    where('participantIds', 'array-contains', userUid),
    orderBy('lastMessageAt', 'desc')
  );

  return onSnapshot(threadsQuery, (querySnapshot) => {
    const threads = querySnapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          participantIds: data.participantIds as [string, string],
          participantNames: data.participantNames as [string, string] || ['Utilisateur', 'Utilisateur'],
          participantAvatars: data.participantAvatars as [string, string] || ['https://placehold.co/100x100.png?text=?', 'https://placehold.co/100x100.png?text=?'],
          lastMessageText: data.lastMessageText,
          lastMessageSenderId: data.lastMessageSenderId,
          lastMessageAt: convertTimestampToISO(data.lastMessageAt as Timestamp),
          createdAt: convertTimestampToISO(data.createdAt as Timestamp),
          participantsWhoHaveSeenLatest: data.participantsWhoHaveSeenLatest || [],
          itemId: data.itemId,
          itemTitle: data.itemTitle,
          itemImageUrl: data.itemImageUrl,
          itemSellerId: data.itemSellerId,
          discussedItemIds: data.discussedItemIds || [],
          deletedFor: data.deletedFor || [],
          itemConversationsDeletedFor: data.itemConversationsDeletedFor || {},
          blockedBy: data.blockedBy || null,
          unreadItemsFor: data.unreadItemsFor || {},
        } as MessageThread;
      })
      .filter(thread => !thread.deletedFor?.includes(userUid)); // Filter client-side

    onUpdate(threads);
  }, (error) => {
    console.error("Error fetching message threads: ", error);
    onUpdate([]);
  });
};

export const getMessagesForItemInThread = (
  threadId: string,
  itemId: string,
  onUpdate: (messages: Message[]) => void
): Unsubscribe => {
  if (!threadId || !itemId) {
    onUpdate([]);
    return () => {};
  }
  
  const messagesQuery = query(
    collection(db, 'messageThreads', threadId, 'messages'),
    where('itemId', '==', itemId)
    // Removed orderBy('timestamp') to avoid needing a composite index
  );

  return onSnapshot(messagesQuery, (querySnapshot) => {
    const messages = querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        threadId: data.threadId,
        senderId: data.senderId,
        senderName: data.senderName || "Utilisateur Inconnu",
        text: data.text,
        imageUrl: data.imageUrl,
        audioUrl: data.audioUrl,
        itemId: data.itemId,
        timestamp: convertTimestampToISO(data.timestamp as Timestamp),
        readBy: data.readBy || [],
      } as Message;
    });
    
    // Sort messages by timestamp on the client side
    const sortedMessages = messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    onUpdate(sortedMessages);

  }, (error) => {
    console.error(`Error fetching messages for thread ${threadId} and item ${itemId}: `, error);
    onUpdate([]);
  });
};


export const markMessageAsRead = async (threadId: string, messageId: string, userId: string): Promise<void> => {
  if (!threadId || !messageId || !userId) {
    console.warn("markMessageAsRead requires threadId, messageId, and userId");
    return;
  }
  const messageRef = doc(db, 'messageThreads', threadId, 'messages', messageId);
  try {
    const messageSnap = await getDoc(messageRef);
    if (messageSnap.exists()) {
      const messageData = messageSnap.data() as Message;
      // Only update if userId is not already in readBy to avoid unnecessary writes
      if (!messageData.readBy || !messageData.readBy.includes(userId)) {
        await updateDoc(messageRef, {
          readBy: arrayUnion(userId)
        });
      }
    }
  } catch (error) {
    console.error(`Error marking message ${messageId} as read by ${userId}:`, error);
  }
};

export const listenToThreadDocument = (
  threadId: string,
  onUpdate: (thread: MessageThread | null) => void
): Unsubscribe => {
  if (!threadId) {
    onUpdate(null);
    return () => {};
  }
  const threadRef = doc(db, 'messageThreads', threadId);

  return onSnapshot(threadRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const threadData = {
        id: docSnap.id,
        participantIds: data.participantIds,
        participantNames: data.participantNames,
        participantAvatars: data.participantAvatars,
        lastMessageText: data.lastMessageText,
        lastMessageSenderId: data.lastMessageSenderId,
        lastMessageAt: convertTimestampToISO(data.lastMessageAt as Timestamp),
        createdAt: convertTimestampToISO(data.createdAt as Timestamp),
        participantsWhoHaveSeenLatest: data.participantsWhoHaveSeenLatest || [],
        itemId: data.itemId,
        itemTitle: data.itemTitle,
        itemImageUrl: data.itemImageUrl,
        itemSellerId: data.itemSellerId,
        discussedItemIds: data.discussedItemIds || [],
        deletedFor: data.deletedFor || [],
        itemConversationsDeletedFor: data.itemConversationsDeletedFor || {},
        blockedBy: data.blockedBy || null,
        unreadItemsFor: data.unreadItemsFor || {},
      } as MessageThread;
      onUpdate(threadData);
    } else {
      onUpdate(null);
    }
  }, (error) => {
    console.error(`Error listening to thread document ${threadId}:`, error);
    onUpdate(null);
  });
};

export async function getThreadWithDiscussedItems(threadId: string, currentUserId: string): Promise<{thread: MessageThread, items: Item[]} | null> {
    if (!threadId || !currentUserId) return null;
    try {
        const threadRef = doc(db, 'messageThreads', threadId);
        const threadSnap = await getDoc(threadRef);

        if (!threadSnap.exists()) {
            console.log(`No such thread document with ID: ${threadId}`);
            return null;
        }

        const data = threadSnap.data();
        if (data.deletedFor?.includes(currentUserId)) {
          console.log(`Thread ${threadId} is deleted for user ${currentUserId}.`);
          return null;
        }

        const threadData = {
            id: threadSnap.id,
            ...data,
            lastMessageAt: convertTimestampToISO(data.lastMessageAt as Timestamp),
            createdAt: convertTimestampToISO(data.createdAt as Timestamp),
            deletedFor: data.deletedFor || [],
            itemConversationsDeletedFor: data.itemConversationsDeletedFor || {},
            blockedBy: data.blockedBy || null,
            unreadItemsFor: data.unreadItemsFor || {},
        } as MessageThread;

        let items: Item[] = [];
        const userDeletedItems = threadData.itemConversationsDeletedFor?.[currentUserId] || [];
        const visibleItemIds = threadData.discussedItemIds.filter(id => !userDeletedItems.includes(id));
        
        if (visibleItemIds && visibleItemIds.length > 0) {
            const itemPromises = visibleItemIds.map(id => getItemByIdFromFirestore(id));
            items = (await Promise.all(itemPromises)).filter((item): item is Item => item !== null);
        }

        return { thread: threadData, items };

    } catch (error) {
        console.error(`Error fetching thread with items for ID ${threadId}:`, error);
        return null;
    }
}


export async function markThreadAsSeenByCurrentUser(threadId: string, userId: string): Promise<void> {
  if (!threadId || !userId) {
    console.warn("markThreadAsSeenByCurrentUser requires threadId and userId");
    return;
  }
  const threadRef = doc(db, 'messageThreads', threadId);
  try {
    // Check if the user is already in the array to prevent redundant updates
    // This read is optional but can save a write if the user is already marked as seen.
    const threadSnap = await getDoc(threadRef);
    if (threadSnap.exists()) {
      const threadData = threadSnap.data() as MessageThread;
      if (!threadData.participantsWhoHaveSeenLatest || !threadData.participantsWhoHaveSeenLatest.includes(userId)) {
        await updateDoc(threadRef, {
          participantsWhoHaveSeenLatest: arrayUnion(userId)
        });
      }
    }
  } catch (error) {
    console.error(`Error marking thread ${threadId} as seen by ${userId}:`, error);
  }
}

export async function deleteThreadForUser(threadId: string, userId: string): Promise<void> {
  if (!threadId || !userId) {
    throw new Error("L'ID du fil et de l'utilisateur sont requis.");
  }
  const threadRef = doc(db, 'messageThreads', threadId);
  try {
    await updateDoc(threadRef, {
      deletedFor: arrayUnion(userId)
    });
  } catch (error) {
    console.error(`Error deleting thread ${threadId} for user ${userId}:`, error);
    throw error;
  }
}

export async function deleteItemConversationForUser(threadId: string, itemId: string, userId: string): Promise<void> {
  if (!threadId || !itemId || !userId) {
    throw new Error("L'ID du fil, de l'article et de l'utilisateur sont requis.");
  }
  const threadRef = doc(db, 'messageThreads', threadId);
  try {
    // Using dot notation for updating a specific key in a map
    await updateDoc(threadRef, {
      [`itemConversationsDeletedFor.${userId}`]: arrayUnion(itemId)
    });
  } catch (error) {
    console.error(`Error deleting item conversation ${itemId} in thread ${threadId} for user ${userId}:`, error);
    throw error;
  }
}

export async function blockThread(threadId: string, blockerId: string): Promise<void> {
  if (!threadId || !blockerId) {
    throw new Error("Thread ID and Blocker ID are required.");
  }
  const threadRef = doc(db, 'messageThreads', threadId);
  await updateDoc(threadRef, {
    blockedBy: blockerId,
  });
}

export async function unblockThread(threadId: string): Promise<void> {
  if (!threadId) {
    throw new Error("Thread ID is required.");
  }
  const threadRef = doc(db, 'messageThreads', threadId);
  await updateDoc(threadRef, {
    blockedBy: deleteField(),
  });
}

export async function markItemAsReadInThread(threadId: string, itemId: string, userId: string): Promise<void> {
  if (!threadId || !itemId || !userId) return;
  const threadRef = doc(db, 'messageThreads', threadId);
  try {
    await updateDoc(threadRef, {
      [`unreadItemsFor.${userId}`]: arrayRemove(itemId)
    });
  } catch (error) {
    console.error(`Error marking item ${itemId} as read in thread ${threadId} for user ${userId}:`, error);
  }
}
