

export interface ViewHistoryItem {
  itemId: string;
  viewedAt: string;
  category: string;
  price: number;
  name: string;
  description: string;
}

export const DeliveryOptions = ['Moto', 'Voiture', 'Pickup', 'Taxi Baggage', 'Camion', 'Remise en main propre'] as const;
export type DeliveryOption = typeof DeliveryOptions[number];

export const ShippingPayers = ['Seller', 'Buyer', 'Shared'] as const;
export type ShippingPayer = typeof ShippingPayers[number];


export interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  imageUrls: string[];
  videoUrl?: string; // Add videoUrl field
  sellerId: string;
  sellerName: string;
  postedDate: string;
  condition?: 'neuf' | 'comme neuf' | 'bon' | 'passable' | 'pauvre'; // Updated conditions
  dataAiHint?: string;
  itemId?: string; // Optional: can be used to link a thread to an item
  lastUpdated?: string; // For showing when item was last modified
  suspectedSold?: boolean;
  isSold?: boolean;
  soldAt?: string;
  lowActivity?: boolean;
  phoneNumber?: string;
  whatsappNumber?: string;
  deliveryOptions?: DeliveryOption[];
  shippingPayer?: ShippingPayer;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  dataAiHint?: string;
  joinedDate: string;
  lastActiveAt?: string;
  credits: number; // User's credit balance
  freeListingsRemaining: number; // Number of free listings left
  subscriberCount?: number; // How many people subscribe to this user
  subscriptionCount?: number; // How many people this user subscribes to
  isFoundingMember?: boolean;
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
  imageUrl?: string; // For image attachments
  audioUrl?: string; // For audio attachments
  timestamp: string; // ISO date string (will be Firestore ServerTimestamp on write, converted on read)
  readBy?: string[]; // Array of user UIDs who have read the message
  itemId: string; // The ID of the item this message is about. Now mandatory.
}

export interface MessageThread {
  id: string; // Firestore document ID (e.g., uid1_uid2)
  participantIds: [string, string]; // Array of two user UIDs, sorted
  participantNames: [string, string]; // Denormalized names corresponding to participantIds
  participantAvatars: [string, string]; // Denormalized avatar URLs
  lastMessageText?: string; // Denormalized for list display
  lastMessageSenderId?: string;
  lastMessageAt: string; // ISO date string (Firestore ServerTimestamp on write)
  createdAt: string; // ISO date string (Firestore ServerTimestamp on write)
  itemId?: string; // The item associated with the LATEST message
  itemTitle?: string; // Denormalized item title
  itemImageUrl?: string; // Denormalized item primary image URL
  itemSellerId?: string;
  participantsWhoHaveSeenLatest?: string[]; // UIDs of participants who have seen the latest messages
  discussedItemIds: string[]; // Array of all item IDs ever discussed in this thread.
  deletedFor?: string[]; // Array of user UIDs for whom the thread is "deleted"
  itemConversationsDeletedFor?: { [key: string]: string[] }; // Map of userId to array of itemIds they deleted
  blockedBy?: string | null; // UID of the user who initiated the block
  unreadItemsFor?: { [userId: string]: string[] }; // Map of userId to array of unread itemIds
}

export const ItemCategories = [
  "Autre",
  "Bébés et Enfants",
  "Électronique",
  "Équipement et Outils",
  "Jouets et Jeux",
  "Livres, Films et Musique",
  "Maison et Jardin",
  "Meubles",
  "Mobilier",
  "Objets de Collection et Art",
  "Santé et Beauté",
  "Sports et Plein Air",
  "Téléphones et Portables",
  "Véhicules",
  "Vêtements et Accessoires",
] as const;

export type ItemCategory = typeof ItemCategories[number];

export const ItemConditions = ['neuf', 'comme neuf', 'bon', 'passable', 'pauvre'] as const;
export type ItemCondition = typeof ItemConditions[number];

export interface PaymentIntent {
    id: string; // Document ID, same as ref_command
    userId: string;
    creditAmount: number;
    price: number;
    status: 'pending' | 'success' | 'failed';
    createdAt: string; // ISO date string
    updatedAt: string; // ISO date string
    paytechToken?: string;
}

export interface UserCollection {
  id: string;
  userId: string;
  name: string;
  createdAt: string; // ISO string
  itemCount: number;
  previewImageUrls: string[];
}

export interface CollectionItem {
    itemId: string;
    addedAt: string; // ISO string
}

export interface Notification {
  id: string;
  type: 'new_item' | 'new_subscriber' | 'general';
  userId: string; // The user who receives the notification
  relatedUserId?: string; // The user who triggered the notification (e.g., the seller)
  relatedUserName?: string;
  relatedUserAvatar?: string;
  itemId?: string;
  itemName?: string;
  itemImageUrl?: string;
  createdAt: string;
  isRead: boolean;
}

export type SortByOption = 'date_desc' | 'price_asc' | 'price_desc';
