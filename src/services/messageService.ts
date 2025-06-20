
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
  limit
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

const generateThreadId = (uid1: string, uid2: string): string => {
  if (!uid1 || !uid2) {
    const errorMessage = "SERVICE_UID_ERROR: UIDs cannot be empty for generating thread ID";
    console.error(errorMessage, {uid1, uid2});
    throw new Error(errorMessage);
  }
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
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
    // This case should ideally not happen if userId is sourced from auth.currentUser.uid by the caller.
    // However, it's a good check.
    console.error('CLIENT_STORAGE_UPLOAD_ERROR: Mismatch between provided userId and auth.currentUser.uid.', { providedUserId: userId, authUid: currentFirebaseUser.uid });
    throw new Error("User ID mismatch during image upload authentication.");
  } else {
    console.log('CLIENT_STORAGE_UPLOAD: auth.currentUser.uid matches provided userId:', currentFirebaseUser.uid);
  }


  const uniqueFileName = `${Date.now()}_${file.name}`;
  // Path was corrected in a previous step to include userId
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
    // Log the detailed error from Firebase Storage
    console.error("CLIENT_STORAGE_UPLOAD_ERROR: Error during Firebase Storage operation (uploadBytes or getDownloadURL).", 
                  { errorName: error.name, errorCode: error.code, errorMessage: error.message, fullErrorObject: error });
    throw error; // Re-throw to be caught by the calling component's toast
  }
};

export const createOrGetMessageThread = async (
  currentUserUid: string,
  otherUserUid: string,
  itemId?: string
): Promise<{ threadId: string | null; error?: string; threadData?: MessageThread | null }> => {
  console.log("SERVICE: createOrGetMessageThread called");
  console.log("SERVICE: currentUserUid:", currentUserUid);
  console.log("SERVICE: otherUserUid:", otherUserUid);
  console.log("SERVICE: itemId:", itemId);


  if (!currentUserUid || !otherUserUid) {
    const errorMessage = "SERVICE_UID_ERROR: Both currentUserUid and otherUserUid are required.";
    console.error(errorMessage, { currentUserUid, otherUserUid });
    return { threadId: null, error: "Les identifiants utilisateurs sont manquants pour créer le fil de discussion." };
  }
  if (currentUserUid === otherUserUid) {
    const errorMessage = "SERVICE_SELF_CHAT_ERROR: Cannot create a message thread with oneself.";
    console.error(errorMessage, { currentUserUid, otherUserUid });
    return { threadId: null, error: "Vous ne pouvez pas créer un fil de discussion avec vous-même." };
  }

  let threadId;
  try {
    threadId = generateThreadId(currentUserUid, otherUserUid);
  } catch (e: any) {
    console.error("SERVICE: Error generating threadId:", e.message);
    return { threadId: null, error: e.message };
  }
  
  const threadRef = doc(db, 'messageThreads', threadId);
  console.log(`SERVICE: Generated threadId: ${threadId}. Thread ref path: ${threadRef.path}`);

  try {
    console.log(`SERVICE: Attempting to get document: ${threadRef.path}`);
    const threadSnap = await getDoc(threadRef);
    console.log(`SERVICE: getDoc for ${threadRef.path} completed. Exists: ${threadSnap.exists()}`);

    let itemDetails: Item | null = null;
    if (itemId) {
        console.log(`SERVICE: Fetching item details for itemId: ${itemId}`);
        itemDetails = await getItemByIdFromFirestore(itemId);
        console.log(`SERVICE: Item details fetched: ${itemDetails ? JSON.stringify(itemDetails.name) : 'Not Found'}`);
    }

    if (!threadSnap.exists()) {
      console.log(`SERVICE: Thread ${threadId} does not exist. Attempting to create...`);
      const currentUserProfile = await getUserDocument(currentUserUid);
      if (!currentUserProfile) {
        const errorMessage = `SERVICE_PROFILE_ERROR: Failed to fetch current user profile (UID: ${currentUserUid}) for creating thread.`;
        console.error(errorMessage);
        return { threadId: null, error: "Impossible de récupérer le profil de l'utilisateur actuel." };
      }
      console.log(`SERVICE: Fetched current user profile: ${currentUserProfile.name || 'N/A'}`);

      const otherUserProfile = await getUserDocument(otherUserUid);
      if (!otherUserProfile) {
        const errorMessage = `SERVICE_PROFILE_ERROR: Failed to fetch other user profile (UID: ${otherUserUid}) for creating thread.`;
        console.error(errorMessage);
        return { threadId: null, error: "Impossible de récupérer le profil du vendeur." };
      }
      console.log(`SERVICE: Fetched other user profile: ${otherUserProfile.name || 'N/A'}`);

      const participantUidsSorted: [string, string] = currentUserUid < otherUserUid ? [currentUserUid, otherUserUid] : [otherUserUid, currentUserUid];
      const namesSorted = participantUidsSorted[0] === currentUserUid ? [currentUserProfile.name, otherUserProfile.name] : [otherUserProfile.name, currentUserProfile.name];
      const avatarsSorted = participantUidsSorted[0] === currentUserUid ? [currentUserProfile.avatarUrl, otherUserProfile.avatarUrl] : [otherUserProfile.avatarUrl, currentUserProfile.avatarUrl];

      const newThreadData: Omit<MessageThread, 'id'> & { createdAt: any, lastMessageAt: any } = {
        participantIds: participantUidsSorted,
        participantNames: [namesSorted[0] || 'Utilisateur', namesSorted[1] || 'Utilisateur'],
        participantAvatars: [avatarsSorted[0] || 'https://placehold.co/100x100.png?text=?', avatarsSorted[1] || 'https://placehold.co/100x100.png?text=?'],
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        lastMessageText: itemDetails ? `Question à propos de "${itemDetails.name}"` : "Début de la conversation",
        lastMessageSenderId: '',
        itemId: itemDetails?.id || '',
        itemTitle: itemDetails?.name || '',
        itemImageUrl: itemDetails?.imageUrls?.[0] || '',
      };
      console.log(`SERVICE: Preparing to setDoc for new thread ${threadId} with data:`, JSON.stringify(newThreadData, null, 2));
      await setDoc(threadRef, newThreadData);
      console.log(`SERVICE: Successfully created new thread ${threadId}.`);
      const createdThreadDoc = await getDoc(threadRef); 
      const resolvedData = createdThreadDoc.data();
      return { 
        threadId: threadId, 
        error: undefined, 
        threadData: resolvedData ? {
          id: createdThreadDoc.id,
          ...resolvedData,
          createdAt: convertTimestampToISO(resolvedData.createdAt as Timestamp),
          lastMessageAt: convertTimestampToISO(resolvedData.lastMessageAt as Timestamp),
        } as MessageThread : null
      };
    } else {
      console.log(`SERVICE: Thread ${threadId} already exists.`);
      const existingData = threadSnap.data() as MessageThread; // Cast existing data for type safety
      let updated = false;
      const updatePayload: Partial<MessageThread> = {};

      if (itemDetails && (!existingData.itemId || existingData.itemId !== itemDetails.id)) {
        updatePayload.itemId = itemDetails.id;
        updatePayload.itemTitle = itemDetails.name;
        updatePayload.itemImageUrl = itemDetails.imageUrls?.[0];
        updated = true;
      }
      if(updated) {
        console.log(`SERVICE: Updating item context for existing thread ${threadId} with payload:`, JSON.stringify(updatePayload, null, 2));
        await updateDoc(threadRef, updatePayload);
        console.log(`SERVICE: Updated item context for existing thread ${threadId}.`);
      }
      const currentThreadData = updated ? {...existingData, ...updatePayload} : existingData;
      return { 
        threadId: threadId, 
        error: undefined,
        threadData: {
          id: threadSnap.id,
          ...currentThreadData,
          createdAt: convertTimestampToISO(currentThreadData.createdAt as Timestamp), // Ensure conversion
          lastMessageAt: convertTimestampToISO(currentThreadData.lastMessageAt as Timestamp), // Ensure conversion
        }
      };
    }
  } catch (error: any) {
    let specificError = "Une erreur technique est survenue lors de la création/récupération du fil de discussion.";
    if (error.code === 'permission-denied' || (error.message && error.message.toLowerCase().includes('permission denied'))) {
      specificError = "Permissions Firestore insuffisantes. Veuillez vérifier vos règles de sécurité Firestore.";
      console.error(`SERVICE: Firestore Permission Denied for thread ${threadId}: ${error.message}`, error.stack);
    } else {
      console.error(`SERVICE: Error for thread ${threadId}: ${error.message}`, error.stack);
    }
    return { threadId: null, error: specificError, threadData: null };
  }
};

export const sendMessage = async (
  threadId: string,
  senderId: string,
  senderName: string,
  text: string,
  imageUrl?: string
): Promise<void> => {
  if (!text.trim() && !imageUrl) return; 
  if (!threadId || !senderId || !senderName) {
    console.error("ThreadID, SenderID, and SenderName are required to send a message.");
    throw new Error("Missing required parameters for sending message.");
  }

  const threadRef = doc(db, 'messageThreads', threadId);
  const messagesColRef = collection(threadRef, 'messages');

  const newMessageData: Omit<Message, 'id' | 'timestamp'> & { timestamp: any } = {
    threadId,
    senderId,
    senderName: senderName || "Utilisateur Inconnu",
    text: text.trim(),
    timestamp: serverTimestamp(),
    readBy: [senderId], 
  };
  if (imageUrl) {
    newMessageData.imageUrl = imageUrl;
  }

  try {
    const batch = writeBatch(db);
    const newMsgDocRef = doc(messagesColRef); // Auto-generate ID for new message
    batch.set(newMsgDocRef, newMessageData);
    
    let lastMessagePreview = text.trim();
    if (imageUrl && !text.trim()) {
        lastMessagePreview = "📷 Image";
    } else if (imageUrl && text.trim()) {
        lastMessagePreview = `📷 ${text.trim()}`;
    }

    batch.update(threadRef, {
      lastMessageText: lastMessagePreview,
      lastMessageSenderId: senderId,
      lastMessageAt: serverTimestamp(),
    });
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
    const threads = querySnapshot.docs.map((docSnap) => {
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
        itemId: data.itemId,
        itemTitle: data.itemTitle,
        itemImageUrl: data.itemImageUrl,
      } as MessageThread;
    });
    onUpdate(threads);
  }, (error) => {
    console.error("Error fetching message threads: ", error);
    onUpdate([]);
  });
};

export const getMessagesForThread = (
  threadId: string,
  onUpdate: (messages: Message[]) => void
): Unsubscribe => {
  if (!threadId) {
    console.warn("getMessagesForThread called with no threadId.");
    onUpdate([]);
    return () => {};
  }
  const messagesQuery = query(
    collection(db, 'messageThreads', threadId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100) 
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
        timestamp: convertTimestampToISO(data.timestamp as Timestamp),
        readBy: data.readBy || [],
      } as Message;
    });
    onUpdate(messages);
  }, (error) => {
    console.error(`Error fetching messages for thread ${threadId}: `, error);
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

export async function getThreadInfoById(threadId: string): Promise<MessageThread | null> {
  if (!threadId) return null;
  try {
    const threadRef = doc(db, 'messageThreads', threadId);
    const threadSnap = await getDoc(threadRef);
    if (threadSnap.exists()) {
      const data = threadSnap.data();
      return {
        id: threadSnap.id,
        participantIds: data.participantIds,
        participantNames: data.participantNames,
        participantAvatars: data.participantAvatars,
        lastMessageText: data.lastMessageText,
        lastMessageSenderId: data.lastMessageSenderId,
        lastMessageAt: convertTimestampToISO(data.lastMessageAt as Timestamp),
        createdAt: convertTimestampToISO(data.createdAt as Timestamp),
        itemId: data.itemId,
        itemTitle: data.itemTitle,
        itemImageUrl: data.itemImageUrl,
      } as MessageThread;
    }
    return null;
  } catch (error) {
    console.error("Error fetching thread info by ID:", error);
    return null;
  }
}
    
