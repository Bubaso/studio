
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { UserStory } from '@/lib/types';
import { getFollowingStatusFeed } from '@/services/userService';
import { StatusStories } from './status-stories';

export function HomeStatusFeed() {
  const { firebaseUser, authLoading } = useAuth();
  const [statusFeed, setStatusFeed] = useState<UserStory[]>([]);
  
  useEffect(() => {
    // If auth is loading, we don't know the user yet.
    if (authLoading) return;

    // If there is a logged-in user, fetch their feed.
    if (firebaseUser) {
      getFollowingStatusFeed(firebaseUser.uid).then(setStatusFeed);
    } else {
      // If user logs out, clear the feed.
      setStatusFeed([]);
    }
  }, [firebaseUser, authLoading]);
  
  // The StatusStories component already handles the case where items is empty.
  // It will render nothing, which is the desired behavior for logged-out users
  // or users with an empty feed.
  return <StatusStories items={statusFeed} />;
}
