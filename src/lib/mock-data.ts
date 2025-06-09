
import type { Item, UserProfile as User, Review, ItemCategory, ItemCondition, Message, MessageThread } from './types'; // Updated User to UserProfile

// The users array now represents UserProfile data that might be fetched or stored,
// but authentication is handled by Firebase.
const users: User[] = [
  {
    uid: 'user1', // Changed id to uid
    name: 'Alice Dubois',
    email: 'alice@example.com',
    avatarUrl: 'https://placehold.co/100x100.png?text=AD',
    dataAiHint: "profil femme",
    joinedDate: new Date(2023, 0, 15).toISOString(),
    location: 'Paris, FR',
    // ratings, reviews, listings will be handled differently with Firestore
  },
  {
    uid: 'user2', // Changed id to uid
    name: 'Bob Martin',
    email: 'bob@example.com',
    avatarUrl: 'https://placehold.co/100x100.png?text=BM',
    dataAiHint: "profil homme",
    joinedDate: new Date(2023, 2, 10).toISOString(),
    location: 'Lyon, FR',
  },
  {
    uid: 'user3', // Changed id to uid
    name: 'Charles Bernard',
    email: 'charles@example.com',
    avatarUrl: 'https://placehold.co/100x100.png?text=CB',
    dataAiHint: "profil personne",
    joinedDate: new Date(2022, 5, 20).toISOString(),
    location: 'Marseille, FR',
  },
];

const items: Item[] = [
  {
    id: 'item1',
    name: 'Veste en Cuir Vintage',
    description: 'Une veste en cuir vintage élégante, à peine portée. Taille M. Excellent état, look classique.',
    price: 49000, 
    category: 'Vêtements et Accessoires' as ItemCategory,
    location: 'Dakar, SN', 
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'veste cuir',
    sellerId: 'user1', // This should match a user's uid
    sellerName: 'Alice Dubois',
    postedDate: new Date(2023, 5, 1).toISOString(),
    condition: 'comme neuf' as ItemCondition,
  },
  {
    id: 'item2',
    name: 'Chaise en Bois Antique',
    description: 'Chaise en bois antique magnifiquement ouvragée. Ajoute un charme rustique à n\'importe quelle pièce. Chêne massif.',
    price: 79000, 
    category: 'Mobilier' as ItemCategory,
    location: 'Abidjan, CI', 
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'chaise bois',
    sellerId: 'user2', // This should match a user's uid
    sellerName: 'Bob Martin',
    postedDate: new Date(2023, 5, 5).toISOString(),
    condition: 'bon' as ItemCondition,
  },
  {
    id: 'item3',
    name: 'Console de Jeu Rétro',
    description: 'Console de jeu rétro classique avec 2 manettes et 5 jeux populaires. Fonctionne parfaitement.',
    price: 59000, 
    category: 'Électronique' as ItemCategory,
    location: 'Cotonou, BJ', 
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'console jeu',
    sellerId: 'user3', // This should match a user's uid
    sellerName: 'Charles Bernard',
    postedDate: new Date(2023, 4, 20).toISOString(),
    condition: 'bon' as ItemCondition,
  },
  // ... (other items can remain, ensure sellerId corresponds to a uid if needed for other mock functions)
];

const reviews: Review[] = [
    {
        id: 'review1',
        reviewerId: 'user2', // uid of reviewer
        reviewerName: 'Bob Martin',
        rating: 5,
        comment: 'Excellent vendeur, article exactement comme décrit !',
        date: new Date(2023, 5, 2).toISOString(),
        itemId: 'item1',
    },
    // ... other reviews
];

// users[0].reviews = [reviews[1]]; // This direct assignment will be replaced by Firestore logic
// users[0].listings = items.filter(item => item.sellerId === 'user1'); // Replaced by Firestore logic

const messages: Message[] = [
    // ... messages can remain as they are for now, will be integrated later
];

const messageThreads: MessageThread[] = [
    // ... messageThreads can remain for now
];


// Mock item functions (getMockItems, getMockItemById, getMockUserListings, addMockItem) 
// might still be used by some pages. They will be phased out or adapted to use Firestore.
// For now, they can remain to avoid breaking pages not yet migrated.

export const getMockItems = async (filters?: { category?: ItemCategory; priceMin?: number; priceMax?: number; location?: string; query?: string; condition?: ItemCondition }): Promise<Item[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // This function will eventually be replaced by calls to itemService.ts with Firestore
      resolve(items);
    }, 100); 
  });
};

export const getMockItemById = async (id: string): Promise<Item | undefined> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // This function will eventually be replaced by calls to itemService.ts with Firestore
      resolve(items.find(item => item.id === id));
    }, 100);
  });
};

// This function is still used by profile/[userId] page for displaying other users' listings from mock data
// It will be replaced by Firestore calls eventually.
export const getMockUserListings = async (userId: string): Promise<Item[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(items.filter(item => item.sellerId === userId).sort((a,b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()));
        }, 100);
    });
};

// This function is still used by profile/[userId] page for displaying other users' profile from mock data
// It will be replaced by Firestore calls eventually.
export const getMockUserById = async (id: string): Promise<User | undefined> => {
  return new Promise(resolve => {
    setTimeout(() => {
      // This will be replaced by getUserDocument(uid) from userService.ts
      const user = users.find(user => user.uid === id); // search by uid
      // if (user) {
      //   user.reviews = reviews.filter(review => {
      //       const reviewedItem = items.find(item => item.id === review.itemId);
      //       return reviewedItem?.sellerId === user.uid;
      //   });
      // }
      resolve(user);
    }, 100);
  });
};

export const addMockItem = async (itemData: Omit<Item, 'id' | 'postedDate' | 'sellerName' | 'dataAiHint'> & { dataAiHint?: string }): Promise<Item> => {
    return new Promise(resolve => {
        setTimeout(() => {
            // This will be replaced by add item to Firestore logic in itemService.ts
            const seller = users.find(u => u.uid === itemData.sellerId);
            const newItem: Item = {
                ...itemData,
                id: `item${items.length + 1}`,
                postedDate: new Date().toISOString(),
                sellerName: seller?.name || 'Vendeur inconnu',
                dataAiHint: itemData.dataAiHint || `${itemData.category} ${itemData.name.split(' ').slice(0,1).join('')}`.toLowerCase()
            };
            items.unshift(newItem);
            // if (seller) {
            //     seller.listings = [newItem, ...(seller.listings || [])]; // This pattern won't work easily with UserProfile
            // }
            resolve(newItem);
        }, 100);
    });
};

export const addMockMessage = async (messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
    return new Promise(resolve => {
        setTimeout(() => {
            // This will be replaced by add message to Firestore logic
            const newMessage: Message = {
                ...messageData,
                id: `msg${messages.length + 1}`,
                timestamp: new Date().toISOString(),
            };
            messages.push(newMessage);
            const thread = messageThreads.find(t => t.id === messageData.threadId);
            if (thread) {
                thread.lastMessage = newMessage;
                thread.lastMessageAt = newMessage.timestamp;
            }
            resolve(newMessage);
        }, 100);
    });
};

// Commenting out Firebase Auth related mock functions as they are replaced by actual Firebase Auth
/*
let currentMockUser: User | null = users[0]; // Default to Alice

export const getMockCurrentUser = async (): Promise<User | null> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(currentMockUser);
        }, 50);
    });
};

export const mockSignIn = async (userIdToSignIn: string): Promise<User | null> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const user = users.find(u => u.uid === userIdToSignIn);
            if (user) {
                currentMockUser = user;
                resolve(user);
            } else {
                resolve(null); // User not found
            }
        }, 100);
    });
};

export const mockSignOut = async (): Promise<void> => {
     return new Promise((resolve) => {
        setTimeout(() => {
            currentMockUser = null;
            resolve();
        }, 50);
    });
};
*/

// Mock functions for message threads, will be replaced later
export const getMockMessageThreads = async (userId: string): Promise<MessageThread[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(messageThreads.filter(thread => thread.participantIds.includes(userId)).sort((a,b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()));
        }, 100);
    });
};

export const getMockMessagesForThread = async (threadId: string): Promise<Message[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(messages.filter(message => message.threadId === threadId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() ));
        }, 100);
    });
};
