
export interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  location?: string;
  imageUrl: string;
  sellerId: string;
  sellerName: string;
  postedDate: string; // ISO date string
  condition?: 'new' | 'like new' | 'good' | 'fair' | 'poor';
  dataAiHint?: string;
}

export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  dataAiHint?: string;
  joinedDate: string; // ISO date string
  ratings?: { value: number; count: number };
  reviews?: Review[];
  listings?: Item[];
  location?: string;
}

export interface Review {
  id: string;
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
