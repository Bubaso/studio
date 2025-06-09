
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useFormState } from 'react-dom'; 
import { auth } from '@/lib/firebase';
import { createOrGetThreadAndRedirect } from '@/actions/messageActions';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react'; // Added Loader2
import { useToast } from "@/hooks/use-toast"; 

interface ContactSellerButtonClientProps {
  sellerId: string;
  itemId: string;
}

// Define the shape of the state returned by the server action
interface ActionState {
  error?: string | null;
  success?: boolean;
  threadId?: string | null;
}

const initialState: ActionState = {
  error: null,
  success: false,
  threadId: null,
};

export function ContactSellerButtonClient({ sellerId, itemId }: ContactSellerButtonClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Bind currentUserId, sellerId and itemId to the action for useFormState
  // Note: currentUser might be null initially, the action needs to handle this
  const actionWithArgs = createOrGetThreadAndRedirect.bind(null, currentUser?.uid || '', sellerId, itemId);
  
  // useFormState returns [state, formActionFunction, isPending (optional)]
  // The 'pending' state can be used to disable the button while action is processing
  const [state, formAction, isPending] = useFormState(
    (prevState: ActionState, formData: FormData) => actionWithArgs(), // formData is not directly used by createOrGetThreadAndRedirect
    initialState
  );


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
    // A successful redirect is handled by the server action itself,
    // so no explicit success toast is needed here unless the action changes to return a success state.
  }, [state, toast]);


  if (isLoadingAuth) {
    return (
      <Button size="lg" variant="outline" className="w-full flex-1" disabled>
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Contacter le vendeur
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
      <Button type="submit" size="lg" variant="outline" className="w-full" disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : (
          <MessageSquare className="mr-2 h-5 w-5" />
        )}
        {isPending ? "Envoi..." : "Contacter le vendeur"}
      </Button>
    </form>
  );
}
