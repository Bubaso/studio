
"use client";

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import type { Item } from '@/lib/types';
import { ListingForm } from '@/components/listing-form';
import { Loader2, LogIn, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast"; 

interface EditItemClientAuthWrapperProps {
  item: Item;
}

export function EditItemClientAuthWrapper({ item }: EditItemClientAuthWrapperProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
      
      // Run checks only after initial auth state is determined
      if (!isLoadingAuth && item) { 
          if (user && user.uid !== item.sellerId) {
            toast({ variant: "destructive", title: "Accès non autorisé", description: "Vous ne pouvez pas modifier cet article." });
            router.push(`/items/${item.id}`);
          } else if (!user) { 
            toast({ variant: "destructive", title: "Connexion requise", description: "Vous devez être connecté pour modifier un article." });
            router.push(`/auth/signin?redirect=/items/${item.id}/edit`);
          }
      }
    });
    return () => unsubscribe();
  // Add item to dependency array to re-run effect if item changes, though not expected here.
  // isLoadingAuth is used to delay checks until auth is ready.
  }, [item, router, isLoadingAuth, toast]);


  if (isLoadingAuth || !item) { // Also check if item is loaded, though page.tsx should handle !item
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Vérification de l'autorisation...</p>
      </div>
    );
  }

  // These are fallbacks, useEffect should handle redirection earlier
  if (!currentUser) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <LogIn className="h-4 w-4" />
          <AlertTitle>Connexion requise</AlertTitle>
          <AlertDescription>
            Vous devez être connecté pour modifier un article. Redirection...
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (currentUser.uid !== item.sellerId) { 
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4"/>
          <AlertTitle>Accès non autorisé</AlertTitle>
          <AlertDescription>
            Vous n'êtes pas autorisé à modifier cet article. Redirection...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <ListingForm initialItemData={item} />;
}
