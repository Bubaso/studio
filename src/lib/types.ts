
export interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  location?: string;
  imageUrls: string[]; // Changed from imageUrl: string
  sellerId: string; // This will be user.uid
  sellerName: string; // This can be user.name or user.displayName
  postedDate: string; // ISO date string
  condition?: 'new' | 'like new' | 'good' | 'fair' | 'poor';
  dataAiHint?: string; // Will refer to the primary image or item in general
}

// Represents the data structure for a user's profile stored in Firestore
export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null; // displayName
  avatarUrl: string | null; // photoURL
  dataAiHint?: string;
  joinedDate: string; // ISO date string
  location?: string;
  // Other fields like ratings, reviews count can be added here
  // listings will be fetched separately
}

export interface Review {
  id:string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string; // ISO date string
  itemId?: string; // Optional: if review is for an item transaction
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string; // denormalized for easier display
  text: string;
  timestamp: string; // ISO date string
}

export interface MessageThread {
  id: string;
  participantIds: string[];
  participantNames: string[]; // [name1, name2]
  participantAvatars: string[]; // [avatar1, avatar2]
  lastMessage?: Message;
  lastMessageAt: string; // ISO date string
  unreadCount?: number; // for current user
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

export const ItemConditions = ['neuf', 'comme neuf', 'bon', 'passable', 'pauvre'] as const;
export type ItemCondition = typeof ItemConditions[number];
