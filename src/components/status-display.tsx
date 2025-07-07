

"use client";

import { useEffect, useState } from 'react';
import type { UserProfile, UserStatus, Item } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Pin } from 'lucide-react';
import { getItemByIdFromFirestore } from '@/services/itemService';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface StatusDisplayProps {
  user: UserProfile;
  status: UserStatus;
}

export function StatusDisplay({ user, status }: StatusDisplayProps) {
  const t = useTranslations('StatusDisplay');
  const [item, setItem] = useState<Item | null>(null);
  const [isLoadingItem, setIsLoadingItem] = useState(false);

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

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary/80 mb-2">
            <Pin className="h-4 w-4" />
            <span>{t('title', { name: user.name?.split(' ')[0] || 'Utilisateur' })}</span>
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
