
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom'; // Import useFormState
import { auth } from '@/lib/firebase';
import { createOrGetThreadAndRedirect } from '@/actions/messageActions';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useToast } from "@/hooks/use-toast"; // Import useToast

interface ContactSellerButtonClientProps {
  sellerId: string;
  itemId: string;
}

const initialState = {
  error: null,
  success: false,
  threadId: null,
};

export function ContactSellerButtonClient({ sellerId, itemId }: ContactSellerButtonClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Bind sellerId and itemId to the action for useFormState
  const actionWithArgs = createOrGetThreadAndRedirect.bind(null, currentUser?.uid || '', sellerId, itemId);
  const [state, formAction] = useFormState(actionWithArgs, initialState);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (state?.error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: state.error,
      });
    }
    // No explicit success toast here as successful action leads to redirect
  }, [state, toast]);


  if (isLoadingAuth) {
    return (
      <Button size="lg" variant="outline" className="w-full flex-1" disabled>
        <MessageSquare className="mr-2 h-5 w-5" /> Chargement...
      </Button>
    );
  }

  if (currentUser && currentUser.uid === sellerId) {
    return null; // Don't show button if it's the seller's own item
  }

  if (!currentUser) {
    const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/items/${itemId}`;
    const redirectTo = `/auth/signin?redirect=${encodeURIComponent(currentPath)}`;
    return (
      <Button size="lg" variant="outline" className="w-full flex-1" onClick={() => router.push(redirectTo)}>
        <MessageSquare className="mr-2 h-5 w-5" /> Contacter le vendeur (Connexion requise)
      </Button>
    );
  }

  // User is logged in and is not the seller
  return (
    <form action={formAction} className="flex-1">
      <Button type="submit" size="lg" variant="outline" className="w-full">
        <MessageSquare className="mr-2 h-5 w-5" /> Contacter le vendeur
      </Button>
    </form>
  );
}
