
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getUserDocument } from '@/services/userService';
import { Gem } from 'lucide-react';

const NOTIFICATION_KEY = 'foundingMemberNotified';

export function FoundingMemberNotifier() {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (firebaseUser) {
      const hasBeenNotified = sessionStorage.getItem(NOTIFICATION_KEY);
      if (hasBeenNotified) {
        return;
      }

      const checkAndNotify = async () => {
        try {
          const userProfile = await getUserDocument(firebaseUser.uid);
          if (userProfile?.isFoundingMember) {
            toast({
              title: (
                <div className="flex items-center gap-2">
                  <Gem className="h-5 w-5 text-primary" />
                  Avantage Membre Fondateur !
                </div>
              ),
              description: "Félicitations ! En tant que l'un de nos 100 premiers utilisateurs, vous avez reçu 10 annonces gratuites supplémentaires. Vous avez maintenant un total de 15 annonces gratuites.",
              duration: 15000, // 15 seconds
            });
            sessionStorage.setItem(NOTIFICATION_KEY, 'true');
          }
        } catch (error) {
            console.error("Failed to check for founding member status:", error);
        }
      };

      // Delay slightly to ensure user document is created and to not overwhelm the user on login
      setTimeout(checkAndNotify, 2000); 
    }
  }, [firebaseUser, toast]);

  return null; // This component does not render anything
}
