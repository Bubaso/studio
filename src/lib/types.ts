
export interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  location?: string;
  imageUrls: string[];
  sellerId: string;
  sellerName: string;
  postedDate: string;
  condition?: 'neuf' | 'comme neuf' | 'bon' | 'passable' | 'pauvre'; // Updated conditions
  dataAiHint?: string;
  itemId?: string; // Optional: can be used to link a thread to an item
}

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  dataAiHint?: string;
  joinedDate: string;
  location?: string;
}

export interface Review {
  id: string; // Firestore document ID
  itemId: string;
  sellerId: string; // Added to know who the review is for (seller of the item)
  reviewerId: string;
  reviewerName: string;
  reviewerAvatarUrl?: string | null; // Denormalized avatar of the reviewer
  rating: number; // 1-5
  comment: string;
  createdAt: string; // ISO date string (Firestore ServerTimestamp on write)
}

export interface Message {
  id: string; // Firestore document ID
  threadId: string;
  senderId: string;
  senderName: string; // Denormalized for display
  text: string;
  timestamp: string; // ISO date string (will be Firestore ServerTimestamp on write, converted on read)
}

export interface MessageThread {
  id: string; // Firestore document ID (e.g., uid1_uid2)
  participantIds: [string, string]; // Array of two user UIDs, sorted
  participantNames: [string, string]; // Denormalized names corresponding to participantIds
  participantAvatars: [string, string]; // Denormalized avatar URLs
  lastMessageText?: string; // Denormalized for list display
  lastMessageSenderId?: string;
  lastMessageAt: string; // ISO date string (Firestore ServerTimestamp on write)
  itemId?: string; // Optional: if the conversation is about a specific item
  // unreadCount can be complex; omitting for now for client-side simplicity
}

export const ItemCategories = [
  "Électronique",
  "Mobilier",
  "Vêtements et Accessoires",
  "Maison et Jardin",
  "Livres, Films et Musique",
  "Sports et Plein Air",
  "Jouets et Jeux",
  "Objets de Collection et Art",
  "Véhicules",
  "Autre",
] as const;

export type ItemCategory = typeof ItemCategories[number];

// Updated ItemConditions to French and consistent casing
export const ItemConditions = ['neuf', 'comme neuf', 'bon', 'passable', 'pauvre'] as const;
export type ItemCondition = typeof ItemConditions[number];
