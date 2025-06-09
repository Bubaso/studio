
'use client'; // Can be called from client components if needed, though actions are preferred for mutations

import { db } from '@/lib/firebase';
import type { Message, MessageThread, UserProfile } from '@/lib/types';
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
  serverTimestamp,
  Timestamp,
  Unsubscribe,
  writeBatch,
  limit
} from 'firebase/firestore';
import { getUserDocument } from './userService';

const convertTimestampToISO = (timestamp: Timestamp | undefined | string): string => {
  if (!timestamp) return new Date().toISOString(); // Default for missing
  if (typeof timestamp === 'string') return timestamp; // Already a string
  // Check if it's a Firestore Timestamp-like object with a toDate method
  if (timestamp && typeof (timestamp as Timestamp).toDate === 'function') {
    try {
      return (timestamp as Timestamp).toDate().toISOString();
    } catch (e) {
      console.warn('Error converting timestamp toDate:', timestamp, e);
      return new Date().toISOString(); // Fallback on conversion error
    }
  }
  // If it's not a string, not undefined, and not a valid Timestamp, it's malformed.
  console.warn('Invalid timestamp format encountered in messageService:', timestamp);
  return new Date().toISOString(); // Fallback for malformed
};

// Generates a deterministic thread ID from two user UIDs
const generateThreadId = (uid1: string, uid2: string): string => {
  if (!uid1 || !uid2) {
    console.error("UIDs cannot be empty for generating thread ID");
    throw new Error("UIDs cannot be empty");
  }
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

export const createOrGetMessageThread = async (
  currentUserUid: string,
  otherUserUid: string,
  itemId?: string
): Promise<string | null> => {
  if (!currentUserUid || !otherUserUid) {
    console.error("Both currentUserUid and otherUserUid are required.");
    return null;
  }
  if (currentUserUid === otherUserUid) {
    console.error("Cannot create a message thread with oneself.");
    return null;
  }

  const threadId = generateThreadId(currentUserUid, otherUserUid);
  const threadRef = doc(db, 'messageThreads', threadId);
  
  try {
    const threadSnap = await getDoc(threadRef);

    if (!threadSnap.exists()) {
      const currentUserProfile = await getUserDocument(currentUserUid);
      const otherUserProfile = await getUserDocument(otherUserUid);

      if (!currentUserProfile || !otherUserProfile) {
        console.error("Could not find user profiles to create thread. currentUserUid:", currentUserUid, "otherUserUid:", otherUserUid);
        return null;
      }
      
      const participantUidsSorted: [string, string] = currentUserUid < otherUserUid ? [currentUserUid, otherUserUid] : [otherUserUid, currentUserUid];
      const namesSorted = participantUidsSorted[0] === currentUserUid ? [currentUserProfile.name, otherUserProfile.name] : [otherUserProfile.name, currentUserProfile.name];
      const avatarsSorted = participantUidsSorted[0] === currentUserUid ? [currentUserProfile.avatarUrl, otherUserProfile.avatarUrl] : [otherUserProfile.avatarUrl, currentUserProfile.avatarUrl];

      const newThreadData: Omit<MessageThread, 'id' | 'lastMessageAt'> & { lastMessageAt: any } = {
        participantIds: participantUidsSorted,
        participantNames: [namesSorted[0] || 'Utilisateur', namesSorted[1] || 'Utilisateur'],
        participantAvatars: [avatarsSorted[0] || 'https://placehold.co/100x100.png?text=?', avatarsSorted[1] || 'https://placehold.co/100x100.png?text=?'],
        lastMessageAt: serverTimestamp(), // Initialize with current time
        lastMessageText: itemId ? "Conversation à propos d'un article" : "Début de la conversation",
        lastMessageSenderId: '', // No sender for initial placeholder message
        itemId: itemId || '',
      };
      await setDoc(threadRef, newThreadData);
      return threadId;
    } else {
      // If thread exists and itemId is provided, update it if not already set or different
      const existingData = threadSnap.data();
      if (itemId && (!existingData.itemId || existingData.itemId !== itemId)) {
        await setDoc(threadRef, { itemId: itemId }, { merge: true });
      }
    }
    return threadId;
  } catch (error) {
    console.error("Error in createOrGetMessageThread: ", error);
    return null;
  }
};

export const sendMessage = async (
  threadId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<void> => {
  if (!text.trim()) return;
  if (!threadId || !senderId || !senderName) {
    console.error("ThreadID, SenderID, and SenderName are required to send a message.");
    throw new Error("Missing required parameters for sending message.");
  }

  const threadRef = doc(db, 'messageThreads', threadId);
  const messagesColRef = collection(threadRef, 'messages');

  const newMessage: Omit<Message, 'id' | 'timestamp'> & { timestamp: any } = {
    threadId,
    senderId,
    senderName: senderName || "Utilisateur Inconnu", // Fallback for senderName
    text: text.trim(),
    timestamp: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    const newMsgDocRef = doc(messagesColRef); // Generate a new doc ref for the message
    batch.set(newMsgDocRef, newMessage);      // Use set with the new doc ref
    batch.update(threadRef, {
      lastMessageText: text.trim(),
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
    return () => {}; // Return a no-op unsubscribe function
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
        itemId: data.itemId,
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
        timestamp: convertTimestampToISO(data.timestamp as Timestamp),
      } as Message;
    });
    onUpdate(messages);
  }, (error) => {
    console.error(`Error fetching messages for thread ${threadId}: `, error);
    onUpdate([]);
  });
};
