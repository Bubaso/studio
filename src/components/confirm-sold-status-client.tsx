
"use client";

import { useTransition } from 'react';
import { useRouter } from '@/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { markItemAsSold, rejectSuspectedSold } from '@/services/itemService';
import type { Item } from '@/lib/types';
import { useTranslations } from 'next-intl';

interface ConfirmSoldStatusClientProps {
  item: Item;
}

export function ConfirmSoldStatusClient({ item }: ConfirmSoldStatusClientProps) {
  const t = useTranslations('ConfirmSoldStatus');
  const [isConfirming, startConfirming] = useTransition();
  const [isRejecting, startRejecting] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const { firebaseUser: currentUser, authLoading } = useAuth();
  
  const isPending = isConfirming || isRejecting;

  // Render nothing if: auth is loading, no user, user is not seller, item is not suspected, or item is already permanently sold.
  if (authLoading || !currentUser || currentUser.uid !== item.sellerId || !item.suspectedSold || item.isSold) {
    return null;
  }
  
  const handleConfirm = () => {
    startConfirming(async () => {
      try {
        await markItemAsSold(item.id);
        toast({ title: t('toast.statusUpdated'), description: t('toast.markedAsSold') });
        router.refresh();
      } catch (error: any) {
        toast({ variant: "destructive", title: t('toast.error'), description: error.message || t('toast.confirmError') });
      }
    });
  };

  const handleReject = () => {
    startRejecting(async () => {
      try {
        await rejectSuspectedSold(item.id);
        toast({ title: t('toast.listingReactivated'), description: t('toast.reportsCleared') });
        router.refresh();
      } catch (error: any) {
        toast({ variant: "destructive", title: t('toast.error'), description: error.message || t('toast.updateError') });
      }
    });
  };

  return (
    <Alert variant="destructive" className="mb-6 bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300 [&>svg]:text-yellow-800 dark:[&>svg]:text-yellow-300">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="font-bold">{t('title')}</AlertTitle>
      <AlertDescription>
        {t('description')}
        <div className="mt-4 flex flex-col sm:flex-row gap-3">
          <Button onClick={handleConfirm} disabled={isPending} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
            {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            {t('yesSold')}
          </Button>
          <Button onClick={handleReject} disabled={isPending} variant="outline" className="w-full sm:w-auto text-yellow-800 border-yellow-800/50 hover:bg-yellow-200/50 hover:text-yellow-900">
            {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
            {t('noAvailable')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
