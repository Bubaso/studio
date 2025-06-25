import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProfileEditForm } from '../profile-edit-form';
import type { UserProfile } from '@/lib/types';

// Mock child components and hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock('@/services/userService', () => ({
  updateUserProfile: jest.fn(),
  uploadAvatarAndGetURL: jest.fn(),
}));

jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-123',
    },
  },
  storage: jest.fn()
}));

describe('ProfileEditForm', () => {
  const mockUserProfile: UserProfile = {
    uid: 'test-user-123',
    name: 'John Doe',
    email: 'john@doe.com',
    location: 'Test City',
    joinedDate: new Date().toISOString(),
    avatarUrl: 'http://example.com/avatar.jpg',
    dataAiHint: 'profile',
  };

  it('renders the form with the current user profile data', () => {
    render(<ProfileEditForm currentUserProfile={mockUserProfile} />);

    // Check if form fields are pre-filled
    expect(screen.getByLabelText(/Nom complet/i)).toHaveValue(mockUserProfile.name as string);
    expect(screen.getByLabelText(/Lieu/i)).toHaveValue(mockUserProfile.location as string);
    
    // Check if avatar is displayed
    const avatarImage = screen.getByAltText(mockUserProfile.name || 'Avatar') as HTMLImageElement;
    expect(avatarImage.src).toContain(mockUserProfile.avatarUrl);
  });
});
