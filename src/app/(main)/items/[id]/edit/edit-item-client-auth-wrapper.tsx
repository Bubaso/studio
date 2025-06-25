"use client";

import { useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import type { Item } from '@/lib/types';
import { ListingForm } from '@/components/listing-form';
import { Loader2, AlertTriangle, LogIn } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface EditItemClientAuthWrapperProps {
  item: Item;
}

export function EditItemClientAuthWrapper({ item }: EditItemClientAuthWrapperProps) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // This effect now only handles redirecting non-owners.
    // The main render logic will handle the "not logged in" case.
    if (!loading && user) {
      if (user.uid !== item.sellerId) {
        toast({
          variant: 'destructive',
          title: 'Accès non autorisé',
          description: 'Vous ne pouvez pas modifier cet article.',
        });
        router.push(`/items/${item.id}`);
      }
    }
  }, [user, loading, item, router, toast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Vérification de l'autorisation...</p>
      </div>
    );
  }
  
  // Handle case where user is not logged in
  if (!user) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center p-4">
            <Alert className="max-w-md">
                <LogIn className="h-4 w-4" />
                <AlertTitle>Connexion requise</AlertTitle>
                <AlertDescription>
                Vous devez être connecté pour modifier cette annonce.
                </AlertDescription>
            </Alert>
            <Link href={`/auth/signin?redirect=/items/${item.id}/edit`} className="mt-6">
                <Button>
                    <LogIn className="mr-2 h-4 w-4" /> Se connecter
                </Button>
            </Link>
        </div>
    );
  }

  // If user is logged in and is the owner, show the form.
  if (user.uid === item.sellerId) {
    return <ListingForm initialItemData={item} />;
  }

  // Fallback for non-owners during redirection.
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-300px)] text-center p-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Accès non autorisé</AlertTitle>
        <AlertDescription>
          Vous n'êtes pas autorisé à modifier cet article. Redirection...
        </AlertDescription>
      </Alert>
    </div>
  );
}
