"use client";

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { addFavorite, removeFavorite, isFavorited } from '@/services/favoriteService';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface FavoriteButtonClientProps {
  itemId: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
}

export function FavoriteButtonClient({ itemId, className, size = 'icon' }: FavoriteButtonClientProps) {
  const { firebaseUser: currentUser, authLoading: isLoadingAuth } = useAuth();
  const [isFavoritedState, setIsFavoritedState] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!isLoadingAuth && itemId) {
      if (currentUser) {
        isFavorited(currentUser.uid, itemId).then(setIsFavoritedState);
      } else {
        setIsFavoritedState(false);
      }
    }
  }, [itemId, currentUser, isLoadingAuth]);

  const handleToggleFavorite = () => {
    if (!currentUser) {
      toast({
        title: "Connexion requise",
        description: "Pour ajouter un article à vos favoris, veuillez vous connecter.",
        action: <Button onClick={() => router.push(`/auth/signin?redirect=/items/${itemId}`)}>Se connecter</Button>
      });
      return;
    }

    const previousFavoritedState = isFavoritedState;
    setIsFavoritedState(!previousFavoritedState); // Optimistic update

    startTransition(async () => {
      const action = previousFavoritedState ? removeFavorite : addFavorite;
      const result = await action(currentUser.uid, itemId);

      if (!result.success) {
        // On failure, revert the state and show an error toast.
        setIsFavoritedState(previousFavoritedState);
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error || "La mise à jour de vos favoris a échoué.",
        });
      }
    });
  };

  if (isLoadingAuth) {
    return (
      <Button variant="ghost" size={size} className={cn("text-muted-foreground", className)} disabled>
        <Loader2 className={cn("h-5 w-5 animate-spin", size === 'icon' ? "h-5 w-5" : "h-4 w-4 mr-2")} />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleToggleFavorite}
      disabled={isPending || isLoadingAuth}
      className={cn(
        "transition-colors duration-200 ease-in-out",
        isFavoritedState ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500",
        className
      )}
      aria-label={isFavoritedState ? "Retirer des favoris" : "Ajouter aux favoris"}
    >
      {isPending ? (
        <Loader2 className={cn("animate-spin", size === 'icon' ? "h-5 w-5" : "h-4 w-4 mr-2")} />
      ) : (
        <Heart className={cn(isFavoritedState ? "fill-current" : "", size === 'icon' ? "h-5 w-5" : "h-4 w-4 mr-2")} />
      )}
      {size !== 'icon' && (isFavoritedState ? 'Favori' : 'Ajouter aux favoris')}
    </Button>
  );
}
