
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, UserCheck } from 'lucide-react';
import { checkSubscription, toggleSubscription } from '@/services/subscriptionService';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface SubscribeButtonProps {
  targetUserId: string;
}

export function SubscribeButton({ targetUserId }: SubscribeButtonProps) {
  const { firebaseUser, authLoading } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, startToggleTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || !firebaseUser) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    checkSubscription(firebaseUser.uid, targetUserId)
      .then(setIsSubscribed)
      .finally(() => setIsLoading(false));

  }, [firebaseUser, targetUserId, authLoading]);

  const handleToggle = async () => {
    if (!firebaseUser) {
      toast({ title: "Connexion requise", description: "Pour vous abonner, vous devez vous connecter.", variant: "destructive" });
      router.push('/auth/signin');
      return;
    }

    startToggleTransition(async () => {
      const result = await toggleSubscription(firebaseUser.uid, targetUserId);
      if (result.success) {
        setIsSubscribed(result.isSubscribed);
        toast({
          title: result.isSubscribed ? "Abonnement réussi" : "Abonnement annulé",
          description: result.isSubscribed ? "Vous recevrez des notifications pour les nouvelles annonces." : "Vous ne recevrez plus de notifications.",
        });
      } else {
        toast({ title: "Erreur", description: result.error, variant: "destructive" });
      }
    });
  };

  if (authLoading || isLoading) {
    return <Button variant="outline" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Chargement...</Button>;
  }

  // Don't show the button on your own profile
  if (firebaseUser?.uid === targetUserId) {
    return null;
  }
  
  if (isSubscribed) {
    return (
      <Button variant="secondary" onClick={handleToggle} disabled={isToggling}>
        {isToggling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
        Abonné
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={handleToggle} disabled={isToggling}>
      {isToggling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
      S'abonner
    </Button>
  );
}
