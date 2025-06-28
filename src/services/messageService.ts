
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


export const sendMessage = async (
  threadId: string,
  senderId: string,
  senderName: string,
  text: string,
  itemId: string, // Item context is now mandatory
  imageUrl?: string,
  audioUrl?: string
): Promise<void> => {
  if (!text.trim() && !imageUrl && !audioUrl) return; 
  if (!threadId || !senderId || !senderName || !itemId) {
    console.error("ThreadID, SenderID, SenderName, and ItemID are required to send a message.");
    throw new Error("Missing required parameters for sending message.");
  }

  const threadRef = doc(db, 'messageThreads', threadId);
  
  // Check for block status before proceeding
  const threadSnap = await getDoc(threadRef);
  if (!threadSnap.exists()) {
    throw new Error("Conversation thread not found.");
  }
  const threadData = threadSnap.data() as MessageThread;
  
  if (threadData.blockedBy) {
    // If the conversation is blocked, no one can send a message.
    throw new Error("La conversation est bloquée. Les messages ne peuvent pas être envoyés.");
  }

  const messagesColRef = collection(threadRef, 'messages');

  const newMessageData: Omit<Message, 'id' | 'timestamp'> & { timestamp: any } = {
    threadId,
    senderId,
    senderName: senderName || "Utilisateur Inconnu",
    text: text.trim(),
    itemId,
    timestamp: serverTimestamp(),
    readBy: [senderId], 
  };
  if (imageUrl) {
    newMessageData.imageUrl = imageUrl;
  }
  if (audioUrl) {
    newMessageData.audioUrl = audioUrl;
  }


  try {
    const batch = writeBatch(db);
    const newMsgDocRef = doc(messagesColRef); 
    batch.set(newMsgDocRef, newMessageData);
    
    let lastMessagePreview = text.trim();
    if (audioUrl) {
      lastMessagePreview = "🎤 Sesli Mesaj";
    } else if (imageUrl && !text.trim()) {
        lastMessagePreview = "📷 Görüntü";
    } else if (imageUrl && text.trim()) {
        lastMessagePreview = `📷 ${text.trim()}`;
    }

    const itemDetails = await getItemByIdFromFirestore(itemId);
    
    const recipientId = threadData.participantIds.find(id => id !== senderId);

    const updateData: { [key: string]: any } = {
      lastMessageText: lastMessagePreview,
      lastMessageSenderId: senderId,
      lastMessageAt: serverTimestamp(),
      participantsWhoHaveSeenLatest: [senderId],
      itemId: itemDetails?.id || '',
      itemTitle: itemDetails?.name || '',
      itemImageUrl: itemDetails?.imageUrls?.[0] || '',
      itemSellerId: itemDetails?.sellerId || '',
    };
    
    // "Undelete" the thread for the recipient. If they had deleted it, 
    // a new message brings it back into their inbox.
    if (recipientId) {
        updateData.deletedFor = arrayRemove(recipientId);
        // Add the item to the recipient's unread items list
        updateData[`unreadItemsFor.${recipientId}`] = arrayUnion(itemId);
    }
    
    batch.update(threadRef, updateData);
    
    await batch.commit();
  } catch (error) {
    console.error("Error sending message: ", error);
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
