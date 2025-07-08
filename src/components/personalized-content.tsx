
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Item, UserStory } from '@/lib/types';
import { getFollowingStatusFeed } from '@/services/userService';
import { PersonalizedRecommendations } from './personalized-recommendations';
import { FeaturedItemsGrid } from './featured-items-grid';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';
import { Button } from './ui/button';
import { useTranslations } from 'next-intl';
import { StatusStories } from './status-stories';

interface PersonalizedContentProps {
  latestItems: Item[];
}

function RecommendationsSkeleton() {
    return (
        <section className="py-4 md:py-6">
            <Skeleton className="h-8 w-1/2 mx-auto mb-4 md:mb-6" />
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <CardSkeleton key={index} />
                ))}
            </div>
        </section>
    );
}

function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3 shadow-sm bg-card">
      <Skeleton className="h-40 w-full bg-muted/50" />
      <Skeleton className="h-6 w-3/4 bg-muted/50" />
      <Skeleton className="h-8 w-1/2 bg-muted/50" />
      <Skeleton className="h-4 w-1/2 bg-muted/50" />
      <Skeleton className="h-4 w-1/3 bg-muted/50" />
      <Skeleton className="h-10 w-full mt-2 bg-muted/50" />
    </div>
  );
}

export function PersonalizedContent({ latestItems }: PersonalizedContentProps) {
  const t = useTranslations('HomePage');
  const { firebaseUser, authLoading } = useAuth();
  const [recommendedItems, setRecommendedItems] = useState<Item[]>([]);
  const [statusFeed, setStatusFeed] = useState<UserStory[]>([]);
  const [isLoadingContent, setIsLoadingContent] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return; // Wait until auth state is resolved
    }

    if (firebaseUser) {
      setIsLoadingContent(true);
      getFollowingStatusFeed(firebaseUser.uid)
        .then(setStatusFeed)
        .finally(() => {
          setIsLoadingContent(false);
        });
    } else {
      // Not logged in, no personalized content to load
      setIsLoadingContent(false);
    }
  }, [firebaseUser, authLoading]);

  return (
    <>
      <StatusStories items={statusFeed} />
      
      {isLoadingContent ? (
        <RecommendationsSkeleton />
      ) : recommendedItems.length > 0 ? (
        <PersonalizedRecommendations items={recommendedItems} />
      ) : (
        <section className="py-4 md:py-6">
          <h2 className="text-xl sm:text-2xl font-bold font-headline text-center mb-4 md:mb-6 text-primary">
            {t('latestFindings')}
          </h2>
          <FeaturedItemsGrid initialItems={latestItems} />
          <div className="text-center mt-6 md:mt-8">
            <Link href="/browse">
              <Button variant="secondary" size="lg">{t('viewAllItems')}</Button>
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
