import type { Item, User, MessageThread, Message, Review, ItemCategory } from './types';

const users: User[] = [
  {
    id: 'user1',
    name: 'Alice Wonderland',
    avatarUrl: 'https://placehold.co/100x100.png?text=AW',
    dataAiHint: "profile woman",
    joinedDate: new Date(2023, 0, 15).toISOString(),
    location: 'New York, NY',
    ratings: { value: 4.5, count: 20 },
  },
  {
    id: 'user2',
    name: 'Bob The Builder',
    avatarUrl: 'https://placehold.co/100x100.png?text=BB',
    dataAiHint: "profile man",
    joinedDate: new Date(2023, 2, 10).toISOString(),
    location: 'San Francisco, CA',
    ratings: { value: 4.8, count: 15 },
  },
  {
    id: 'user3',
    name: 'Charlie Brown',
    avatarUrl: 'https://placehold.co/100x100.png?text=CB',
    dataAiHint: "profile person",
    joinedDate: new Date(2022, 5, 20).toISOString(),
    location: 'Austin, TX',
    ratings: { value: 4.2, count: 5 },
  },
];

const items: Item[] = [
  {
    id: 'item1',
    name: 'Vintage Leather Jacket',
    description: 'A stylish vintage leather jacket, barely worn. Size M. Great condition, classic look.',
    price: 75,
    category: 'Clothing & Accessories' as ItemCategory,
    location: 'New York, NY',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'leather jacket',
    sellerId: 'user1',
    sellerName: 'Alice Wonderland',
    postedDate: new Date(2023, 5, 1).toISOString(),
    condition: 'like new',
  },
  {
    id: 'item2',
    name: 'Antique Wooden Chair',
    description: 'Beautifully crafted antique wooden chair. Adds a rustic charm to any room. Solid oak.',
    price: 120,
    category: 'Furniture' as ItemCategory,
    location: 'San Francisco, CA',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'wooden chair',
    sellerId: 'user2',
    sellerName: 'Bob The Builder',
    postedDate: new Date(2023, 5, 5).toISOString(),
    condition: 'good',
  },
  {
    id: 'item3',
    name: 'Retro Game Console',
    description: 'Classic retro game console with 2 controllers and 5 popular games. Works perfectly.',
    price: 90,
    category: 'Electronics' as ItemCategory,
    location: 'Austin, TX',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'game console',
    sellerId: 'user3',
    sellerName: 'Charlie Brown',
    postedDate: new Date(2023, 4, 20).toISOString(),
    condition: 'good',
  },
  {
    id: 'item4',
    name: 'Designer Handbag',
    description: 'Authentic designer handbag, gently used. Comes with original dust bag. Leather, black.',
    price: 250,
    category: 'Clothing & Accessories' as ItemCategory,
    location: 'New York, NY',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'handbag fashion',
    sellerId: 'user1',
    sellerName: 'Alice Wonderland',
    postedDate: new Date(2023, 5, 10).toISOString(),
    condition: 'like new',
  },
  {
    id: 'item5',
    name: 'Mountain Bike',
    description: 'Durable mountain bike, suitable for all terrains. 21 speeds, front suspension. Recently serviced.',
    price: 180,
    category: 'Sports & Outdoors' as ItemCategory,
    location: 'San Francisco, CA',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'mountain bike',
    sellerId: 'user2',
    sellerName: 'Bob The Builder',
    postedDate: new Date(2023, 5, 12).toISOString(),
    condition: 'good',
  },
  {
    id: 'item6',
    name: 'Signed First Edition Book',
    description: 'Rare signed first edition of a popular novel. Excellent condition, a collector\'s dream.',
    price: 300,
    category: 'Books, Movies & Music' as ItemCategory,
    location: 'New York, NY',
    imageUrl: 'https://placehold.co/600x400.png',
    dataAiHint: 'book collection',
    sellerId: 'user1',
    sellerName: 'Alice Wonderland',
    postedDate: new Date(2023, 5, 15).toISOString(),
    condition: 'new',
  },
];

const reviews: Review[] = [
    {
        id: 'review1',
        reviewerId: 'user2',
        reviewerName: 'Bob The Builder',
        rating: 5,
        comment: 'Great seller, item was exactly as described!',
        date: new Date(2023, 5, 2).toISOString(),
        itemId: 'item1',
    },
    {
        id: 'review2',
        reviewerId: 'user1',
        reviewerName: 'Alice Wonderland',
        rating: 4,
        comment: 'Good communication, chair is lovely but had a small scratch not mentioned.',
        date: new Date(2023, 5, 6).toISOString(),
        itemId: 'item2',
    }
];

users[0].reviews = [reviews[1]]; // Alice reviewed by Bob for item2 (Bob's item)
users[0].listings = items.filter(item => item.sellerId === 'user1');
users[1].reviews = [reviews[0]]; // Bob reviewed by Alice for item1 (Alice's item)
users[1].listings = items.filter(item => item.sellerId === 'user2');
users[2].listings = items.filter(item => item.sellerId === 'user3');


const messages: Message[] = [
    { id: 'msg1', threadId: 'thread1', senderId: 'user1', senderName: 'Alice', text: 'Hi Bob, is the chair still available?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: 'msg2', threadId: 'thread1', senderId: 'user2', senderName: 'Bob', text: 'Yes Alice, it is!', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString() },
    { id: 'msg3', threadId: 'thread1', senderId: 'user1', senderName: 'Alice', text: 'Great! Could I pick it up tomorrow?', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: 'msg4', threadId: 'thread2', senderId: 'user3', senderName: 'Charlie', text: 'Hello Alice, interested in the jacket.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
];

const messageThreads: MessageThread[] = [
    {
        id: 'thread1',
        participantIds: ['user1', 'user2'],
        participantNames: ['Alice Wonderland', 'Bob The Builder'],
        participantAvatars: [users[0].avatarUrl, users[1].avatarUrl],
        lastMessage: messages[2],
        lastMessageAt: messages[2].timestamp,
        unreadCount: 0,
    },
    {
        id: 'thread2',
        participantIds: ['user1', 'user3'],
        participantNames: ['Alice Wonderland', 'Charlie Brown'],
        participantAvatars: [users[0].avatarUrl, users[2].avatarUrl],
        lastMessage: messages[3],
        lastMessageAt: messages[3].timestamp,
        unreadCount: 1, // Assuming current user is user1
    }
];


export const getMockItems = async (filters?: { category?: string; priceMin?: number; priceMax?: number; location?: string; query?: string }): Promise<Item[]> => {
  return new Promise(resolve => {
    setTimeout(() => {
      let filteredItems = items;
      if (filters) {
        if (filters.category) {
          filteredItems = filteredItems.filter(item => item.category === filters.category);
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
      resolve(filteredItems);
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
        // Attach reviews specific to this user profile being viewed
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
            resolve(items.filter(item => item.sellerId === userId));
        }, 400);
    });
};


export const getMockMessageThreads = async (userId: string): Promise<MessageThread[]> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(messageThreads.filter(thread => thread.participantIds.includes(userId)));
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

export const addMockItem = async (itemData: Omit<Item, 'id' | 'postedDate' | 'sellerName'>): Promise<Item> => {
    return new Promise(resolve => {
        setTimeout(() => {
            const seller = users.find(u => u.id === itemData.sellerId);
            const newItem: Item = {
                ...itemData,
                id: `item${items.length + 1}`,
                postedDate: new Date().toISOString(),
                sellerName: seller?.name || 'Unknown Seller',
            };
            items.push(newItem);
            if (seller) {
                seller.listings = [...(seller.listings || []), newItem];
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

// This is a simplified mock auth, in reality use Firebase Auth or NextAuth.js
let currentMockUser: User | null = users[0]; // Alice is logged in by default

export const getMockCurrentUser = async (): Promise<User | null> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(currentMockUser);
        }, 50);
    });
};

export const mockSignIn = async (userId: string): Promise<User | null> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const user = users.find(u => u.id === userId);
            if (user) {
                currentMockUser = user;
                resolve(user);
            } else {
                resolve(null);
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
