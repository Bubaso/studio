
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
  if (!timestamp) return new Date().toISOString();
  if (typeof timestamp === 'string') return timestamp;
  return timestamp.toDate().toISOString();
};

// Generates a deterministic thread ID from two user UIDs
const generateThreadId = (uid1: string, uid2: string): string => {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

export const createOrGetMessageThread = async (
  currentUserUid: string,
  otherUserUid: string,
  itemId?: string
): Promise<string | null> => {
  if (currentUserUid === otherUserUid) {
    console.error("Cannot create a message thread with oneself.");
    return null;
  }

  const threadId = generateThreadId(currentUserUid, otherUserUid);
  const threadRef = doc(db, 'messageThreads', threadId);
  const threadSnap = await getDoc(threadRef);

  if (!threadSnap.exists()) {
    const currentUserProfile = await getUserDocument(currentUserUid);
    const otherUserProfile = await getUserDocument(otherUserUid);

    if (!currentUserProfile || !otherUserProfile) {
      console.error("Could not find user profiles to create thread.");
      return null;
    }
    
    const participantUidsSorted: [string, string] = currentUserUid < otherUserUid ? [currentUserUid, otherUserUid] : [otherUserUid, currentUserUid];
    const namesSorted = participantUidsSorted[0] === currentUserUid ? [currentUserProfile.name || 'Utilisateur', otherUserProfile.name || 'Utilisateur'] : [otherUserProfile.name || 'Utilisateur', currentUserProfile.name || 'Utilisateur'];
    const avatarsSorted = participantUidsSorted[0] === currentUserUid ? [currentUserProfile.avatarUrl || '', otherUserProfile.avatarUrl || ''] : [otherUserProfile.avatarUrl || '', currentUserProfile.avatarUrl || ''];


    const newThreadData: Omit<MessageThread, 'id' | 'lastMessageAt'> & { lastMessageAt: any } = {
      participantIds: participantUidsSorted,
      participantNames: [namesSorted[0] || 'Utilisateur', namesSorted[1] || 'Utilisateur'],
      participantAvatars: [avatarsSorted[0] || 'https://placehold.co/100x100.png?text=?', avatarsSorted[1] || 'https://placehold.co/100x100.png?text=?'],
      lastMessageAt: serverTimestamp(), // Initialize with current time
      lastMessageText: itemId ? "Conversation à propos d'un article" : "Début de la conversation",
      itemId: itemId || '',
    };

    try {
      await setDoc(threadRef, newThreadData);
      return threadId;
    } catch (error) {
      console.error("Error creating message thread: ", error);
      return null;
    }
  } else {
    // If thread exists and itemId is provided, update it if not already set or different
    if (itemId && (!threadSnap.data().itemId || threadSnap.data().itemId !== itemId)) {
      try {
        await setDoc(threadRef, { itemId: itemId }, { merge: true });
      } catch (error) {
        console.error("Error updating itemId on existing thread: ", error);
        // Continue, not a critical failure
      }
    }
  }
  return threadId;
};

export const sendMessage = async (
  threadId: string,
  senderId: string,
  senderName: string,
  text: string
): Promise<void> => {
  if (!text.trim()) return;

  const threadRef = doc(db, 'messageThreads', threadId);
  const messagesColRef = collection(threadRef, 'messages');

  const newMessage: Omit<Message, 'id' | 'timestamp'> & { timestamp: any } = {
    threadId,
    senderId,
    senderName,
    text: text.trim(),
    timestamp: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.add(messagesColRef, newMessage); // Add new message
    batch.update(threadRef, { // Update last message details on the thread
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
        participantNames: data.participantNames as [string, string],
        participantAvatars: data.participantAvatars as [string, string],
        lastMessageText: data.lastMessageText,
        lastMessageSenderId: data.lastMessageSenderId,
        lastMessageAt: convertTimestampToISO(data.lastMessageAt as Timestamp),
        itemId: data.itemId,
      } as MessageThread;
    });
    onUpdate(threads);
  }, (error) => {
    console.error("Error fetching message threads: ", error);
    // Potentially call onUpdate with an empty array or an error state
    onUpdate([]);
  });
};

export const getMessagesForThread = (
  threadId: string,
  onUpdate: (messages: Message[]) => void
): Unsubscribe => {
  const messagesQuery = query(
    collection(db, 'messageThreads', threadId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100) // Load last 100 messages, implement pagination for more
  );

  return onSnapshot(messagesQuery, (querySnapshot) => {
    const messages = querySnapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        threadId: data.threadId,
        senderId: data.senderId,
        senderName: data.senderName,
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
