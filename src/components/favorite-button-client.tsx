
"use client";

import { useEffect, useState, useTransition } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { addFavorite, removeFavorite, isFavorited } from '@/services/favoriteService';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface FavoriteButtonClientProps {
  itemId: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon'; // To control button size
}

export function FavoriteButtonClient({ itemId, className, size = 'icon' }: FavoriteButtonClientProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isFavoritedState, setIsFavoritedState] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
      if (user && itemId) {
        isFavorited(user.uid, itemId).then(setIsFavoritedState);
      } else {
        setIsFavoritedState(false);
      }
    });
    return () => unsubscribe();
  }, [itemId]);

  const handleToggleFavorite = async () => {
    if (!currentUser) {
      toast({
        title: "Connexion requise",
        description: "Pour ajouter un article à vos favoris, veuillez vous connecter.",
        action: <Button onClick={() => router.push(`/auth/signin?redirect=/items/${itemId}`)}>Se connecter</Button>
      });
      return;
    }

    startTransition(async () => {
      const action = isFavoritedState ? removeFavorite : addFavorite;
      const result = await action(currentUser.uid, itemId);
      if (result.success) {
        setIsFavoritedState(!isFavoritedState);
        toast({
          title: isFavoritedState ? "Retiré des favoris" : "Ajouté aux favoris!",
          description: isFavoritedState ? "L'article a été retiré de vos favoris." : "L'article a été ajouté à vos favoris.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error || "Une erreur s'est produite.",
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
