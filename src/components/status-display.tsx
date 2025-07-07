

"use client";

import { useEffect, useState, useTransition } from 'react';
import type { UserProfile, UserStatus, Item } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Pin, Trash2, Loader2 } from 'lucide-react';
import { getItemByIdFromFirestore, deleteItem } from '@/services/itemService';
import { deleteUserStatus } from '@/services/userService';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/context/AuthContext';
import { Button } from './ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

interface StatusDisplayProps {
  user: UserProfile;
  status: UserStatus;
  onStatusDeleted: (statusId: string) => void;
}

export function StatusDisplay({ user, status, onStatusDeleted }: StatusDisplayProps) {
  const t = useTranslations('StatusDisplay');
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const [item, setItem] = useState<Item | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const isOwner = firebaseUser?.uid === user.uid;

  useEffect(() => {
    if (status.itemId) {
      setIsLoadingItem(true);
      getItemByIdFromFirestore(status.itemId)
        .then(setItem)
        .finally(() => setIsLoadingItem(false));
    } else {
      setItem(null);
    }
  }, [status.itemId]);
  
  const handleDelete = () => {
    if (!isOwner) return;
    startDeleteTransition(async () => {
        const result = await deleteUserStatus(user.uid, status.id);
        if(result.success) {
            toast({title: "Statut supprimé"});
            onStatusDeleted(status.id);
        } else {
            toast({variant: "destructive", title: "Erreur", description: "Impossible de supprimer le statut."})
        }
    });
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 text-sm font-semibold text-primary/80 mb-2">
            <div className="flex items-center gap-2">
                <Pin className="h-4 w-4" />
                <span>{t('title', { name: user.name?.split(' ')[0] || 'Utilisateur' })}</span>
            </div>
            {isOwner && (
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-auto px-2 py-1">
                            Effacer le statut
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Cette action supprimera définitivement ce statut.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Oui, supprimer
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
        <p className="text-foreground/90 whitespace-pre-wrap mb-3">
          {status.text}
        </p>

        {isLoadingItem && <ItemSkeleton />}

        {!isLoadingItem && item && (
           <Link href={`/items/${item.id}`} className="block group">
            <div className="border rounded-lg flex gap-3 p-2 bg-background/50 hover:border-primary/50 transition-colors">
              <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                <Image 
                  src={item.imageUrls[0]} 
                  alt={item.name} 
                  fill 
                  className="object-cover"
                  sizes="64px"
                  data-ai-hint="product photo"
                />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">{item.name}</h4>
                <p className="text-md font-bold text-primary">{item.price.toLocaleString('fr-FR')} XOF</p>
              </div>
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function ItemSkeleton() {
    return (
        <div className="border rounded-lg flex gap-3 p-2 bg-background/50">
            <Skeleton className="h-16 w-16 rounded-md" />
            <div className="flex flex-col justify-center space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20" />
            </div>
        </div>
    )
}
