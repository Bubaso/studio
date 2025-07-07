
"use client";

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { getCollectionsForItem } from '@/services/favoriteService';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AddToCollectionDialog } from './add-to-collection-dialog';
import { useTranslations } from 'next-intl';

interface FavoriteButtonClientProps {
  itemId: string;
  sellerId: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg' | 'icon';
}

export function FavoriteButtonClient({ itemId, sellerId, className, size = 'icon' }: FavoriteButtonClientProps) {
  const t = useTranslations('FavoriteButton');
  const { firebaseUser: currentUser, authLoading: isLoadingAuth } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const router = useRouter();

  const checkFavoriteStatus = async () => {
    if (!currentUser || !itemId) {
      setIsFavorited(false);
      setIsChecking(false);
      return;
    }
    setIsChecking(true);
    try {
      const collections = await getCollectionsForItem(currentUser.uid, itemId);
      setIsFavorited(collections.length > 0);
    } catch (error) {
      console.error("Error checking favorite status:", error);
      setIsFavorited(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!isLoadingAuth) {
      checkFavoriteStatus();
    }
  }, [itemId, currentUser, isLoadingAuth]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      toast({
        title: t('loginRequiredTitle'),
        description: t('loginRequiredDesc'),
        action: <Button onClick={() => router.push(`/auth/signin?redirect=/items/${itemId}`)}>{t('loginButton')}</Button>
      });
      return;
    }
    setIsDialogOpen(true);
  };

  const onDialogClose = (wasUpdated: boolean) => {
    setIsDialogOpen(false);
    if (wasUpdated) {
        // Re-check status after dialog closes
        checkFavoriteStatus();
    }
  }

  if (isLoadingAuth || isChecking) {
    return (
      <Button variant="ghost" size={size} className={cn("text-muted-foreground", className)} disabled>
        <Loader2 className={cn("h-5 w-5 animate-spin", size === 'icon' ? "h-5 w-5" : "h-4 w-4 mr-2")} />
      </Button>
    );
  }

  // Hide the button if the current user is the seller of the item.
  if (currentUser && currentUser.uid === sellerId) {
    return null;
  }

  return (
    <>
      <Button
        variant="ghost"
        size={size}
        onClick={handleFavoriteClick}
        disabled={isLoadingAuth}
        className={cn(
          "transition-colors duration-200 ease-in-out",
          isFavorited ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500",
          className
        )}
        aria-label={isFavorited ? t('ariaLabelEdit') : t('ariaLabelAdd')}
      >
        <Heart className={cn(isFavorited ? "fill-current" : "", size === 'icon' ? "h-4 w-4" : "h-4 w-4 mr-2")} />
        {size !== 'icon' && (isFavorited ? t('saved') : t('save'))}
      </Button>

      {currentUser && (
        <AddToCollectionDialog 
            itemId={itemId}
            open={isDialogOpen}
            onOpenChange={onDialogClose}
        />
      )}
    </>
  );
}
