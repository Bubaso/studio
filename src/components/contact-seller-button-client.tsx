
"use client";

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface ContactSellerButtonClientProps {
  sellerId: string;
  itemId: string;
  className?: string;
}

export function ContactSellerButtonClient({ sellerId, itemId, className }: ContactSellerButtonClientProps) {
  const t = useTranslations('ItemDetailPage');
  const router = useRouter();
  const { toast } = useToast();
  const { firebaseUser: currentUser, authLoading: isLoadingAuth } = useAuth();
  const [isPending, startTransition] = useTransition();

  const handleContactSeller = () => {
    if (!currentUser) {
      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/items/${itemId}`;
      const redirectTo = `/auth/signin?redirect=${encodeURIComponent(currentPath)}`;
      router.push(redirectTo);
      return;
    }

    startTransition(async () => {
        try {
        const idToken = await currentUser.getIdToken();
        const response = await fetch('/api/messages/create-thread', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
            otherUserId: sellerId,
            itemId: itemId,
            }),
        });

        const data = await response.json();

        if (response.ok && data.threadId) {
            toast({
              title: t('toasts.discussionStarted'),
              description: t('toasts.redirectingToDiscussion'),
            });
            router.push(`/messages/${data.threadId}`);
        } else {
            console.error("Error from API:", data.error);
            toast({
            variant: "destructive",
            title: t('toasts.error'),
            description: data.error || t('toasts.contactError'),
            });
        }
        } catch (error) {
        console.error("Client-side error contacting seller:", error);
        toast({
            variant: "destructive",
            title: t('toasts.communicationError'),
            description: t('toasts.contactError'),
        });
        }
    });
  };

  if (isLoadingAuth) {
    return (
      <Button variant="secondary" className={cn("w-full flex-1", className)} disabled>
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> {t('contactSeller')}
      </Button>
    );
  }

  if (currentUser && currentUser.uid === sellerId) {
    return null;
  }

  if (!currentUser) {
    const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : `/items/${itemId}`;
    const redirectTo = `/auth/signin?redirect=${encodeURIComponent(currentPath)}`;
    return (
      <Button variant="secondary" className={cn("w-full flex-1", className)} onClick={() => router.push(redirectTo)}>
        <MessageSquare className="mr-2 h-6 w-6" /> {t('contactSellerLoginRequired')}
      </Button>
    );
  }

  return (
    <Button 
        onClick={handleContactSeller} 
        variant="secondary" 
        className={cn("w-full flex-1", className)}
        disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
      ) : (
        <MessageSquare className="mr-2 h-6 w-6" />
      )}
      {isPending ? t('sending') : t('contactSeller')}
    </Button>
  );
}
