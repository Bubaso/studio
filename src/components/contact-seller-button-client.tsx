
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { createOrGetThreadAndRedirect } from '@/actions/messageActions';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

interface ContactSellerButtonClientProps {
  sellerId: string;
  itemId: string;
}

export function ContactSellerButtonClient({ sellerId, itemId }: ContactSellerButtonClientProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

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
    // User is not logged in, show a button to redirect to login
    // Construct the redirect URL to bring the user back to the item page after login
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
    <form action={async () => {
      // currentUser is guaranteed to be non-null here due to the checks above
      // server action will handle redirect or error
      await createOrGetThreadAndRedirect(currentUser.uid, sellerId, itemId);
    }} className="flex-1">
      <Button type="submit" size="lg" variant="outline" className="w-full">
        <MessageSquare className="mr-2 h-5 w-5" /> Contacter le vendeur
      </Button>
    </form>
  );
}
