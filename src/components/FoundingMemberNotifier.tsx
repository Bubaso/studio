
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { listenToUserDocument } from '@/services/userService';
import { Gem } from 'lucide-react';
import { useTranslations } from 'next-intl';

const NOTIFICATION_KEY = 'foundingMemberNotified';

export function FoundingMemberNotifier() {
  const t = useTranslations('FoundingMemberNotifier');
  const { firebaseUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // If there's no user, do nothing.
    if (!firebaseUser) {
      return;
    }

    // Check if the notification has already been shown in this session.
    const hasBeenNotified = sessionStorage.getItem(NOTIFICATION_KEY);
    if (hasBeenNotified) {
      return;
    }

    // Start listening for changes on the user document.
    const unsubscribe = listenToUserDocument(firebaseUser.uid, (userProfile) => {
      // Once we get a profile update, check if they are a founding member
      // and if we haven't already notified them.
      if (userProfile?.isFoundingMember) {
        // Double-check session storage right before showing the toast
        // to prevent race conditions if the listener fires multiple times quickly.
        if (!sessionStorage.getItem(NOTIFICATION_KEY)) {
          toast({
            title: (
              <div className="flex items-center gap-2">
                <Gem className="h-5 w-5 text-primary" />
                {t('title')}
              </div>
            ),
            description: t('description'),
            className: 'text-base', // Increase font size safely
            duration: 20000, // 20 seconds
          });
          // Mark as notified in this session to prevent repeats.
          sessionStorage.setItem(NOTIFICATION_KEY, 'true');
        }
        
        // Once we've confirmed founding member status and notified, we can stop listening.
        // This prevents unnecessary future checks within the same component lifecycle.
        unsubscribe();
      }
    });

    // Cleanup the listener when the component unmounts or the user changes.
    return () => unsubscribe();
    
  }, [firebaseUser, toast, t]); // Dependency array ensures this effect re-runs if the user changes.

  return null; // This component does not render anything.
}
