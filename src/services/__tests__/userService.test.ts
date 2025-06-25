import { getUserDocument } from '../userService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Mock the entire firebase library
jest.mock('@/lib/firebase', () => ({
  db: jest.fn(), // Mock the db export
  auth: jest.fn(),
  storage: jest.fn()
}));

// Mock the individual firestore functions we use
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date(),
    })),
    fromDate: jest.fn((date) => ({
      toDate: () => date,
    })),
  },
}));

describe('userService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (getDoc as jest.Mock).mockClear();
    (doc as jest.Mock).mockClear();
  });

  describe('getUserDocument', () => {
    it('should return a user profile when the document exists', async () => {
      const mockDate = new Date();
      const mockTimestamp = { toDate: () => mockDate };
      const mockUserData = {
        uid: 'test-uid',
        name: 'Test User',
        email: 'test@example.com',
        avatarUrl: 'http://example.com/avatar.png',
        joinedDate: mockTimestamp, // Simulate Firestore Timestamp
        location: 'Test Location',
        dataAiHint: 'profil personne',
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockUserData,
      });

      const user = await getUserDocument('test-uid');
      
      expect(doc).toHaveBeenCalledWith(db, 'users', 'test-uid');
      expect(getDoc).toHaveBeenCalled();
      expect(user).toEqual({
        ...mockUserData,
        joinedDate: mockDate.toISOString(), // The service converts it
        lastActiveAt: undefined,
      });
    });

    it('should return null when the document does not exist', async () => {
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => false,
      });

      const user = await getUserDocument('non-existent-uid');
      
      expect(user).toBeNull();
    });

    it('should return null for an invalid UID', async () => {
        const user = await getUserDocument('invalid/uid');
        expect(getDoc).not.toHaveBeenCalled();
        expect(user).toBeNull();
    });
  });
});
