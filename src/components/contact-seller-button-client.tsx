
"use client";

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';

interface ContactSellerButtonClientProps {
  sellerId: string;
  itemId: string;
}

export function ContactSellerButtonClient({ sellerId, itemId }: ContactSellerButtonClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { firebaseUser: currentUser, authLoading: isLoadingAuth } = useAuth();
  const [isPending, startTransition] = useTransition();

  const handleContactSeller = () => {
    if (!currentUser) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/items/${itemId}`;
      const redirectTo = `/auth/signin?redirect=${encodeURIComponent(currentPath)}`;
      router.push(redirectTo);
      return;
    }

    startTransition(async () => {
        try {
        const response = await fetch('/api/messages/create-thread', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
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
        }
    });
  };

  if (isLoadingAuth) {
    return (
      <Button size="lg" variant="outline" className="w-full flex-1" disabled>
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Contacter le vendeur
      </Button>
    );
  }

  if (currentUser && currentUser.uid === sellerId) {
    return null;
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

  return (
    <Button 
        onClick={handleContactSeller} 
        size="lg" 
        variant="outline" 
        className="w-full flex-1"
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
