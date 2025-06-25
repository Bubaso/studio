"use client";

import { useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import type { Item } from '@/lib/types';
import { ListingForm } from '@/components/listing-form';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";

interface EditItemClientAuthWrapperProps {
  item: Item;
}

export function EditItemClientAuthWrapper({ item }: EditItemClientAuthWrapperProps) {
  // Le middleware gère maintenant la vérification "est connecté".
  // La seule tâche de ce composant est de vérifier que l'utilisateur connecté est le propriétaire de l'article.
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Cet effet s'exécute une fois que l'état d'authentification de l'utilisateur est résolu.
    if (!loading && user) {
      if (user.uid !== item.sellerId) {
        toast({ variant: "destructive", title: "Accès non autorisé", description: "Vous ne pouvez pas modifier cet article." });
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

  // Si le chargement est terminé et que l'utilisateur est le propriétaire, afficher le formulaire.
  // Le useEffect gère la redirection pour les non-propriétaires.
  if (user && user.uid === item.sellerId) {
      return <ListingForm initialItemData={item} />;
  }

  // Interface de secours affichée brièvement pendant la redirection pour les non-propriétaires.
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
