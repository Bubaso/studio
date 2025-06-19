
"use client";

import { useEffect, useState, useTransition } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface ContactSellerButtonClientProps {
  sellerId: string;
  itemId: string;
}

export function ContactSellerButtonClient({ sellerId, itemId }: ContactSellerButtonClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isPending, setIsPending] = useState(false); // Replaces useTransition for fetch

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleContactSeller = async () => {
    if (!currentUser) {
      // This should ideally not be reached if button is hidden/disabled, but as a safeguard.
      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/items/${itemId}`;
      const redirectTo = `/auth/signin?redirect=${encodeURIComponent(currentPath)}`;
      router.push(redirectTo);
      return;
    }

    setIsPending(true);
    try {
      // In a full Admin SDK setup, you'd get the ID token here to send to the API.
      // const idToken = await currentUser.getIdToken();

      const response = await fetch('/api/messages/create-thread', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${idToken}` // Send ID token for server-side verification
        },
        body: JSON.stringify({
          currentUserId: currentUser.uid,
          otherUserId: sellerId,
          itemId: itemId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.threadId) {
        toast({
          title: "Discussion initiée",
          description: "Redirection vers la discussion...",
        });
        router.push(`/messages/${data.threadId}`);
      } else {
        console.error("Error from API:", data.error);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: data.error || "Impossible de contacter le vendeur. Veuillez réessayer.",
        });
      }
    } catch (error) {
      console.error("Client-side error contacting seller:", error);
      toast({
        variant: "destructive",
        title: "Erreur de communication",
        description: "Une erreur s'est produite lors de la tentative de contact du vendeur.",
      });
    } finally {
      setIsPending(false);
    }
  };


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
    // Removed form, using onClick for fetch
    <Button 
        onClick={handleContactSeller} 
        size="lg" 
        variant="outline" 
        className="w-full flex-1" // Ensure className is correctly applied
        disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      ) : (
        <MessageSquare className="mr-2 h-5 w-5" />
      )}
      {isPending ? "Envoi..." : "Contacter le vendeur"}
    </Button>
  );
}
