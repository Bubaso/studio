
"use client";

import { useState, useEffect } from 'react';
import type { Item } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Eye, Heart, Edit, ArrowUpRight, ShieldAlert, ShieldCheck, Clock, ShieldQuestion } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { getViewCount } from '@/services/itemService';
import { Badge } from './ui/badge';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


interface DashboardListingCardProps {
  item: Item;
}

function StatDisplay({ icon: Icon, value, label, isLoading }: { icon: React.ElementType, value: number | null, label: string, isLoading: boolean }) {
  return (
    <div className="flex items-center text-sm text-muted-foreground">
      <Icon className="h-4 w-4 mr-2" />
      {isLoading ? <Skeleton className="h-4 w-12" /> : <span>{value ?? 0} {label}</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: Item['status'] }) {
    const t = useTranslations('Dashboard.statuses');
    
    const statusMap = {
        active: { text: t('active'), icon: ShieldCheck, className: 'bg-green-100 text-green-800 border-green-200' },
        pending_review: { text: t('pending_review'), icon: Clock, className: 'bg-blue-100 text-blue-800 border-blue-200' },
        under_review: { text: t('under_review'), icon: ShieldAlert, className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
        rejected: { text: t('rejected'), icon: ShieldAlert, className: 'bg-red-100 text-red-800 border-red-200' },
    };

    const currentStatus = status && status in statusMap ? statusMap[status] : { text: t('unknown'), icon: ShieldQuestion, className: 'bg-gray-100 text-gray-800 border-gray-200' };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={cn("text-xs font-medium", currentStatus.className)}>
              <currentStatus.icon className="mr-1.5 h-3 w-3" />
              {currentStatus.text}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('tooltip', { status: currentStatus.text })}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
}


export function DashboardListingCard({ item }: DashboardListingCardProps) {
  const t = useTranslations('Dashboard');
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    setIsLoadingStats(true);
    getViewCount(item.id)
      .then(setViewCount)
      .catch(err => {
        console.error(`Failed to get view count for ${item.id}`, err);
        setViewCount(0);
      })
      .finally(() => setIsLoadingStats(false));
  }, [item.id]);

  const imageUrl = item.imageUrls?.[0] || 'https://placehold.co/400x300.png';

  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative w-full sm:w-32 h-32 sm:h-auto flex-shrink-0 rounded-md overflow-hidden bg-muted">
          <Image src={imageUrl} alt={item.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, 128px" />
        </div>
        <div className="flex-grow">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
            <StatusBadge status={item.status} />
          </div>
          <p className="text-primary font-bold">{item.price.toLocaleString('fr-FR')} XOF</p>
          <div className="flex items-center gap-4 mt-2">
            <StatDisplay icon={Eye} value={viewCount} label={t('views')} isLoading={isLoadingStats} />
            {/* Favorite count can be added here later */}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-shrink-0">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/items/${item.id}`}><ArrowUpRight className="mr-2 h-4 w-4" />{t('view')}</Link>
          </Button>
          {!item.isSold && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/items/${item.id}/edit`}><Edit className="mr-2 h-4 w-4" />{t('edit')}</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
