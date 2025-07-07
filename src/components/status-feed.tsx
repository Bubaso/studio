

"use client";

import type { StatusFeedItem } from '@/lib/types';
import { StatusCard } from './status-card';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface StatusFeedProps {
  items: StatusFeedItem[];
}

export function StatusFeed({ items }: StatusFeedProps) {
  const t = useTranslations('StatusFeed');
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section className="py-4 md:py-6">
      <h2 className="text-xl sm:text-2xl font-bold font-headline text-center mb-4 md:mb-6 text-primary flex items-center justify-center gap-2">
        <Users className="h-6 w-6" />
        {t('title')}
      </h2>
      <div className="max-w-2xl mx-auto space-y-4">
        {items.map((item) => (
          <StatusCard key={`${item.user.uid}-${item.status.updatedAt}`} feedItem={item} />
        ))}
      </div>
    </section>
  );
}
