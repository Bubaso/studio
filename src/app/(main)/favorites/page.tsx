
"use client";

import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/hooks/use-favorites';
import { ItemCard } from '@/components/item-card';
import { Loader2, HeartCrack, LogIn, Info } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function FavoritesPage() {
  const { firebaseUser: currentUser, authLoading: isLoadingAuth } = useAuth();
  const { favoriteItems, isLoading: isLoadingFavorites } = useFavorites();

  if (isLoadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Vérification de l'utilisateur...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <Alert className="max-w-md">
          <LogIn className="h-4 w-4" />
          <AlertTitle>Connexion requise</AlertTitle>
          <AlertDescription>
            Pour voir vos articles favoris, veuillez vous connecter.
          </AlertDescription>
        </Alert>
        <Link href="/auth/signin?redirect=/favorites" className="mt-6">
          <Button>
            <LogIn className="mr-2 h-4 w-4" /> Se connecter
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold font-headline text-primary">Mes Articles Favoris</h1>
      
      {isLoadingFavorites ? (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Chargement de vos favoris...</p>
        </div>
      ) : favoriteItems.length > 0 ? (
        <div className="grid grid-cols-2 gap-6">
          {favoriteItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border rounded-lg shadow-sm bg-card p-6">
          <HeartCrack className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Aucun favori pour le moment</h2>
          <p className="text-muted-foreground mb-6">
            Parcourez les articles et cliquez sur l'icône ❤️ pour les ajouter à vos favoris.
          </p>
          <Link href="/browse">
            <Button variant="secondary" size="lg">Explorer les articles</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
