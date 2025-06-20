
"use client";

import { useEffect, useRef } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { updateUserLastActive } from '@/services/userService';

// Update activity every 5 minutes
const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; 

export function UserActivityLogger() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: FirebaseUser | null) => {
      // Clear any existing interval when auth state changes (e.g., user logs out)
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (user) {
        // Update immediately on login or when the app loads for a logged-in user
        updateUserLastActive(user.uid);

        // Then, set up a new interval to update their activity periodically
        intervalRef.current = setInterval(() => {
          updateUserLastActive(user.uid);
        }, ACTIVITY_UPDATE_INTERVAL);
      }
    });

    // Cleanup function to clear listener and interval when the component unmounts
    return () => {
      unsubscribe();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // Empty dependency array ensures this effect runs only once on mount

  return null; // This component does not render anything to the UI
}
