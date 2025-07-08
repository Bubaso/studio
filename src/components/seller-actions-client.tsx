
"use client";

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash, CheckCircle, Edit3 } from 'lucide-react';
import { markItemAsSold, deleteItem } from '@/services/itemService';
import type { Item } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/context/AuthContext';
import { useTranslations } from 'next-intl';

interface SellerActionsClientProps {
  item: Item;
}

export function SellerActionsClient({ item }: SellerActionsClientProps) {
  const t = useTranslations('SellerActions');
  const [isMarkingSold, startMarkingSold] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { firebaseUser: currentUser, authLoading: isLoadingAuth } = useAuth();

  const handleMarkAsSold = () => {
     if (!currentUser || currentUser.uid !== item.sellerId) {
      toast({ variant: "destructive", title: t('toast.error'), description: t('toast.unauthorized') });
      return;
    }
    startMarkingSold(async () => {
      try {
        await markItemAsSold(item.id);
        toast({ title: t('toast.updateSuccess'), description: t('toast.markedAsSoldSuccess') });
        router.refresh();
      } catch (error: any) {
         toast({ variant: "destructive", title: t('toast.error'), description: error.message || t('toast.markAsSoldError') });
      } finally {
        setIsDialogOpen(false);
      }
    });
  };

  const handleDelete = () => {
    if (!currentUser || currentUser.uid !== item.sellerId) {
        toast({ variant: "destructive", title: t('toast.error'), description: t('toast.unauthorized') });
        return;
    }
    startDeleting(async () => {
      try {
        await deleteItem(item.id);
        toast({ title: t('toast.deleteSuccess'), description: t('toast.deleteSuccessDesc') });
        router.push(`/profile`);
        router.refresh();
      } catch (error: any) {
        toast({ variant: "destructive", title: t('toast.error'), description: error.message || t('toast.deleteError') });
      } finally {
        setIsDialogOpen(false);
      }
    });
  };

  if (isLoadingAuth) {
    return (
      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
        <Button disabled variant="outline" className="flex-1">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('loading')}
        </Button>
      </div>
    );
  }

  if (!currentUser || currentUser.uid !== item.sellerId) {
    return null;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
      <Button asChild variant="secondary" className="flex-1">
        <Link href={`/items/${item.id}/edit`}>
          <Edit3 className="mr-2 h-4 w-4" /> {t('editListing')}
        </Link>
      </Button>

      <Button onClick={handleMarkAsSold} disabled={isMarkingSold || item.isSold} variant="outline" className="flex-1">
        {isMarkingSold ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
        {item.isSold ? t('alreadySold') : t('markAsSold')}
      </Button>

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={isDeleting} className="flex-1">
            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
            {t('deleteListing')}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialogDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-col-reverse gap-2">
            <AlertDialogCancel className="mt-0">{t('cancel')}</AlertDialogCancel>
            <Button onClick={handleDelete} disabled={isDeleting || isMarkingSold} className="bg-destructive hover:bg-destructive/90">
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
                {t('continueDeleteButton')}
            </Button>
            <Button 
                onClick={handleMarkAsSold} 
                disabled={isMarkingSold || item.isSold || isDeleting} 
                variant="outline"
            >
                {isMarkingSold ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                {t('markAsSoldButton')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
