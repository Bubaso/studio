
import type { Item, User, MessageThread, Message, Review, ItemCategory, ItemCondition } from './types';

const users: User[] = [
  {
    id: 'user1',
    name: 'Alice Dubois',
    avatarUrl: 'https://placehold.co/100x100.png?text=AD',
    dataAiHint: "profil femme",
    joinedDate: new Date(2023, 0, 15).toISOString(),
    location: 'Paris, FR', // Location can remain for demo purposes
    ratings: { value: 4.5, count: 20 },
  },
  {
    id: 'user2',
    name: 'Bob Martin',
    avatarUrl: 'https://placehold.co/100x100.png?text=BM',
    dataAiHint: "profil homme",
    joinedDate: new Date(2023, 2, 10).toISOString(),
    location: 'Lyon, FR',
    ratings: { value: 4.8, count: 15 },
  },
  {
    id: 'user3',
    name: 'Charles Bernard',
    avatarUrl: 'https://placehold.co/100x100.png?text=CB',
    dataAiHint: "profil personne",
    joinedDate: new Date(2022, 5, 20).toISOString(),
    location: 'Marseille, FR',
    ratings: { value: 4.2, count: 5 },
  },
];

const items: Item[] = [
  {
    id: 'item1',
    name: 'Veste en Cuir Vintage',
    description: 'Une veste en cuir vintage élégante, à peine portée. Taille M. Excellent état, look classique.',
    price: 49000, // Approx 75 EUR
    category: 'Vêtements et Accessoires' as ItemCategory,
    location: 'Dakar, SN', // Changed location for context
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'veste cuir',
    sellerId: 'user1',
    sellerName: 'Alice Dubois',
    postedDate: new Date(2023, 5, 1).toISOString(),
    condition: 'comme neuf' as ItemCondition,
  },
  {
    id: 'item2',
    name: 'Chaise en Bois Antique',
    description: 'Chaise en bois antique magnifiquement ouvragée. Ajoute un charme rustique à n\'importe quelle pièce. Chêne massif.',
    price: 79000, // Approx 120 EUR
    category: 'Mobilier' as ItemCategory,
    location: 'Abidjan, CI', // Changed location for context
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'chaise bois',
    sellerId: 'user2',
    sellerName: 'Bob Martin',
    postedDate: new Date(2023, 5, 5).toISOString(),
    condition: 'bon' as ItemCondition,
  },
  {
    id: 'item3',
    name: 'Console de Jeu Rétro',
    description: 'Console de jeu rétro classique avec 2 manettes et 5 jeux populaires. Fonctionne parfaitement.',
    price: 59000, // Approx 90 EUR
    category: 'Électronique' as ItemCategory,
    location: 'Cotonou, BJ', // Changed location for context
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'console jeu',
    sellerId: 'user3',
    sellerName: 'Charles Bernard',
    postedDate: new Date(2023, 4, 20).toISOString(),
    condition: 'bon' as ItemCondition,
  },
  {
    id: 'item4',
    name: 'Sac à Main de Créateur',
    description: 'Authentique sac à main de créateur, légèrement utilisé. Livré avec son sac anti-poussière d\'origine. Cuir, noir.',
    price: 164000, // Approx 250 EUR
    category: 'Vêtements et Accessoires' as ItemCategory,
    location: 'Dakar, SN',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'sac main mode',
    sellerId: 'user1',
    sellerName: 'Alice Dubois',
    postedDate: new Date(2023, 5, 10).toISOString(),
    condition: 'comme neuf' as ItemCondition,
  },
  {
    id: 'item5',
    name: 'VTT',
    description: 'VTT robuste, adapté à tous les terrains. 21 vitesses, suspension avant. Récemment entretenu.',
    price: 118000, // Approx 180 EUR
    category: 'Sports et Plein Air' as ItemCategory,
    location: 'Abidjan, CI',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'vélo montagne',
    sellerId: 'user2',
    sellerName: 'Bob Martin',
    postedDate: new Date(2023, 5, 12).toISOString(),
    condition: 'bon' as ItemCondition,
  },
  {
    id: 'item6',
    name: 'Livre Première Édition Signée',
    description: 'Rare première édition signée d\'un roman populaire. Excellent état, le rêve d\'un collectionneur.',
    price: 197000, // Approx 300 EUR
    category: 'Livres, Films et Musique' as ItemCategory,
    location: 'Dakar, SN',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'livre collection',
    sellerId: 'user1',
    sellerName: 'Alice Dubois',
    postedDate: new Date(2023, 5, 15).toISOString(),
    condition: 'neuf' as ItemCondition,
  },
];

const reviews: Review[] = [
    {
        id: 'review1',
        reviewerId: 'user2',
        reviewerName: 'Bob Martin',
        rating: 5,
        comment: 'Excellent vendeur, article exactement comme décrit !',
        date: new Date(2023, 5, 2).toISOString(),
        itemId: 'item1',
    },
    {
        id: 'review2',
        reviewerId: 'user1',
        reviewerName: 'Alice Dubois',
        rating: 4,
        comment: 'Bonne communication, la chaise est jolie mais avait une petite égratignure non mentionnée.',
        date: new Date(2023, 5, 6).toISOString(),
        itemId: 'item2',
    }
];

users[0].reviews = [reviews[1]];
users[0].listings = items.filter(item => item.sellerId === 'user1');
users[1].reviews = [reviews[0]];
users[1].listings = items.filter(item => item.sellerId === 'user2');
users[2].listings = items.filter(item => item.sellerId === 'user3');


const messages: Message[] = [
    { id: 'msg1', threadId: 'thread1', senderId: 'user1', senderName: 'Alice', text: 'Bonjour Bob, la chaise est-elle toujours disponible ?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: 'msg2', threadId: 'thread1', senderId: 'user2', senderName: 'Bob', text: 'Oui Alice, elle l\'est !', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString() },
    { id: 'msg3', threadId: 'thread1', senderId: 'user1', senderName: 'Alice', text: 'Super ! Pourrais-je la récupérer demain ?', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: 'msg4', threadId: 'thread2', senderId: 'user3', senderName: 'Charles', text: 'Bonjour Alice, intéressé par la veste.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
];

const messageThreads: MessageThread[] = [
    {
        id: 'thread1',
        participantIds: ['user1', 'user2'],
        participantNames: ['Alice Dubois', 'Bob Martin'],
        participantAvatars: [users[0].avatarUrl, users[1].avatarUrl],
        lastMessage: messages[2],
        lastMessageAt: messages[2].timestamp,
        unreadCount: 0,
    },
    {
        id: 'thread2',
        participantIds: ['user1', 'user3'],
        participantNames: ['Alice Dubois', 'Charles Bernard'],
        participantAvatars: [users[0].avatarUrl, users[2].avatarUrl],
        lastMessage: messages[3],
        lastMessageAt: messages[3].timestamp,
        unreadCount: 1, // Assuming current user is user1
    }
];


export const getMockItems = async (filters?: { category?: ItemCategory; priceMin?: number; priceMax?: number; location?: string; query?: string; condition?: ItemCondition }): Promise<Item[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      let filteredItems = items;
      if (filters) {
        if (filters.category) {
          filteredItems = filteredItems.filter(item => item.category === filters.category);
        }
        if (filters.condition) {
          filteredItems = filteredItems.filter(item => item.condition === filters.condition);
        }
        if (filters.priceMin !== undefined) {
          filteredItems = filteredItems.filter(item => item.price >= filters.priceMin!);
        }
        if (filters.priceMax !== undefined) {
          filteredItems = filteredItems.filter(item => item.price <= filters.priceMax!);
        }
        if (filters.location) {
          filteredItems = filteredItems.filter(item => item.location?.toLowerCase().includes(filters.location!.toLowerCase()));
        }
        if (filters.query) {
          const q = filters.query.toLowerCase();
          filteredItems = filteredItems.filter(item =>
            item.name.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q)
          );
        }
      }
      resolve(filteredItems.sort((a,b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()));
    }, 500); // Simulate network delay
  });
};

export const getMockItemById = async (id: string): Promise<Item | undefined> => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(items.find(item => item.id === id));
    }, 300);
  });
};

export const getMockUserById = async (id: string): Promise<User | undefined> => {
  return new Promise(resolve => {
    setTimeout(() => {
      const user = users.find(user => user.id === id);
      if (user) {
        user.reviews = reviews.filter(review => {
            const reviewedItem = items.find(item => item.id === review.itemId);
            return reviewedItem?.sellerId === user.id;
        });
      }
      resolve(user);
    }, 300);
  });
};


export const getMockUserListings = async (userId: string): Promise<Item[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(items.filter(item => item.sellerId === userId).sort((a,b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()));
        }, 400);
    });
};


export const getMockMessageThreads = async (userId: string): Promise<MessageThread[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(messageThreads.filter(thread => thread.participantIds.includes(userId)).sort((a,b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()));
        }, 300);
    });
};

export const getMockMessagesForThread = async (threadId: string): Promise<Message[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(messages.filter(message => message.threadId === threadId).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime() ));
        }, 200);
    });
};

export const addMockItem = async (itemData: Omit<Item, 'id' | 'postedDate' | 'sellerName' | 'dataAiHint'> & { dataAiHint?: string }): Promise<Item> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const seller = users.find(u => u.id === itemData.sellerId);
            const newItem: Item = {
                ...itemData,
                id: `item${items.length + 1}`,
                postedDate: new Date().toISOString(),
                sellerName: seller?.name || 'Vendeur inconnu',
                dataAiHint: itemData.dataAiHint || `${itemData.category} ${itemData.name.split(' ').slice(0,1).join('')}`.toLowerCase()
            };
            items.push(newItem); // Add to the beginning for most recent
            if (seller) {
                seller.listings = [newItem, ...(seller.listings || [])];
            }
            resolve(newItem);
        }, 500);
    });
};

export const addMockMessage = async (messageData: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
    return new Promise(resolve => {
        setTimeout(() => {
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
            const user = users.find(u => u.id === userIdToSignIn);
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
