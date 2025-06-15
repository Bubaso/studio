
// Can be called from client components if needed, though actions are preferred for mutations

import { db, storage } from '@/lib/firebase';
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
    console.error("UIDs cannot be empty for generating thread ID");
    throw new Error("UIDs cannot be empty");
  }
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

export const uploadChatImageAndGetURL = async (file: File, threadId: string, userId: string): Promise<string> => {
  if (!file || !threadId || !userId) {
    throw new Error("File, thread ID, and user ID are required for chat image upload.");
  }
  const uniqueFileName = `${userId}_${Date.now()}_${file.name}`;
  const imagePath = `chatAttachments/${threadId}/${uniqueFileName}`;
  const imageRef = storageRef(storage, imagePath);

  try {
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading chat image: ", error);
    throw error;
  }
};

export const createOrGetMessageThread = async (
  currentUserUid: string,
  otherUserUid: string,
  itemId?: string
): Promise<{ threadId: string | null; error?: string; threadData?: MessageThread | null }> => {
  if (!currentUserUid || !otherUserUid) {
    const errorMessage = "Both currentUserUid and otherUserUid are required for createOrGetMessageThread.";
    console.error(errorMessage, { currentUserUid, otherUserUid });
    return { threadId: null, error: "Les identifiants utilisateurs sont manquants pour créer le fil de discussion." };
  }
  if (currentUserUid === otherUserUid) {
    const errorMessage = "Cannot create a message thread with oneself.";
    console.error(errorMessage, { currentUserUid, otherUserUid });
    return { threadId: null, error: "Vous ne pouvez pas créer un fil de discussion avec vous-même." };
  }

  const threadId = generateThreadId(currentUserUid, otherUserUid);
  const threadRef = doc(db, 'messageThreads', threadId);

  try {
    const threadSnap = await getDoc(threadRef);
    let itemDetails: Item | null = null;
    if (itemId) {
        itemDetails = await getItemByIdFromFirestore(itemId);
    }

    if (!threadSnap.exists()) {
      console.log(`Thread ${threadId} does not exist. Attempting to create...`);
      const currentUserProfile = await getUserDocument(currentUserUid);
      if (!currentUserProfile) {
        const errorMessage = `Failed to fetch current user profile (UID: ${currentUserUid}) for creating thread.`;
        console.error(errorMessage);
        return { threadId: null, error: "Impossible de récupérer le profil de l'utilisateur actuel." };
      }
      console.log(`Fetched current user profile: ${currentUserProfile.name || 'N/A'}`);

      const otherUserProfile = await getUserDocument(otherUserUid);
      if (!otherUserProfile) {
        const errorMessage = `Failed to fetch other user profile (UID: ${otherUserUid}) for creating thread.`;
        console.error(errorMessage);
        return { threadId: null, error: "Impossible de récupérer le profil du vendeur." };
      }
      console.log(`Fetched other user profile: ${otherUserProfile.name || 'N/A'}`);

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
      await setDoc(threadRef, newThreadData);
      console.log(`Successfully created new thread ${threadId}.`);
      const createdThreadDoc = await getDoc(threadRef); // Fetch again to get timestamps resolved
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
      console.log(`Thread ${threadId} already exists.`);
      const existingData = threadSnap.data() as MessageThread;
      let updated = false;
      const updatePayload: Partial<MessageThread> = {};

      if (itemDetails && (!existingData.itemId || existingData.itemId !== itemDetails.id)) {
        updatePayload.itemId = itemDetails.id;
        updatePayload.itemTitle = itemDetails.name;
        updatePayload.itemImageUrl = itemDetails.imageUrls?.[0];
        updated = true;
      }
      if(updated) {
        await updateDoc(threadRef, updatePayload);
        console.log(`Updated item context for existing thread ${threadId}.`);
      }
      const currentThreadData = updated ? {...existingData, ...updatePayload} : existingData;
      return { 
        threadId: threadId, 
        error: undefined,
        threadData: {
          id: threadSnap.id,
          ...currentThreadData,
          createdAt: convertTimestampToISO(currentThreadData.createdAt as Timestamp),
          lastMessageAt: convertTimestampToISO(currentThreadData.lastMessageAt as Timestamp),
        }
      };
    }
  } catch (error: any) {
    let specificError = "Une erreur technique est survenue lors de la création/récupération du fil de discussion.";
    if (error.code === 'permission-denied') {
      specificError = "Permissions Firestore insuffisantes. Veuillez vérifier vos règles de sécurité Firestore.";
      console.error(`Firestore Permission Denied in createOrGetMessageThread for thread ${threadId}: ${error.message}`, error.stack);
    } else {
      console.error(`Error in createOrGetMessageThread for thread ${threadId}: ${error.message}`, error.stack);
    }
    return { threadId: null, error: specificError };
  }
};

export const sendMessage = async (
  threadId: string,
  senderId: string,
  senderName: string,
  text: string,
  imageUrl?: string
): Promise<void> => {
  if (!text.trim() && !imageUrl) return; // Must have text or image
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
    readBy: [senderId], // Sender has implicitly read it
  };
  if (imageUrl) {
    newMessageData.imageUrl = imageUrl;
  }

  try {
    const batch = writeBatch(db);
    const newMsgDocRef = doc(messagesColRef);
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
    limit(100) // Load last 100 messages, implement pagination later if needed
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
    // Check if already read to avoid unnecessary writes
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
