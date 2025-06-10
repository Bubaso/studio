
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Added for potential login redirect

interface PurchaseItemButtonClientProps {
  sellerId: string;
  itemId: string; 
}

export function PurchaseItemButtonClient({ sellerId, itemId }: PurchaseItemButtonClientProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoadingAuth) {
    return (
      <Button size="lg" className="flex-1" disabled>
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Acheter maintenant
      </Button>
    );
  }

  // Do not show if the current user is the seller
  if (currentUser && currentUser.uid === sellerId) {
    return null; 
  }

  // If user is not logged in, optionally prompt for login or hide
  // For now, let's allow logged-out users to see it, actual purchase flow would handle login.
  // if (!currentUser) {
  //   const currentPath = `/items/${itemId}`;
  //   const redirectTo = `/auth/signin?redirect=${encodeURIComponent(currentPath)}`;
  //   return (
  //     <Button size="lg" className="flex-1" onClick={() => router.push(redirectTo)}>
  //       <ShoppingCart className="mr-2 h-5 w-5" /> Acheter maintenant (Connexion requise)
  //     </Button>
  //   );
  // }
  
  // Show button if user is logged in and not the seller, or if user is not logged in.
  // Actual purchase logic (not implemented) would handle auth.
  return (
    <Button size="lg" className="flex-1">
      <ShoppingCart className="mr-2 h-5 w-5" /> Acheter maintenant
    </Button>
  );
}
