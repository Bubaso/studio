
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Item } from '@/lib/types';
import { getPersonalizedRecommendations } from '@/ai/flows/suggest-recommendations-flow';
import { PersonalizedRecommendations } from './personalized-recommendations';
import { FeaturedItemsGrid } from './featured-items-grid';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';
import { Button } from './ui/button';

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
  const { firebaseUser } = useAuth();
  const [recommendedItems, setRecommendedItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (firebaseUser) {
      getPersonalizedRecommendations(firebaseUser.uid).then(items => {
        setRecommendedItems(items);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [firebaseUser]);

  if (isLoading) {
    return <RecommendationsSkeleton />;
  }

  if (recommendedItems.length > 0) {
    return <PersonalizedRecommendations items={recommendedItems} />;
  }
  
  // Fallback to latest items if no recommendations
  return (
    <section className="py-4 md:py-6">
        <h2 className="text-xl sm:text-2xl font-bold font-headline text-center mb-4 md:mb-6 text-primary">
            Dernières trouvailles sur JëndJaay
        </h2>
        <FeaturedItemsGrid initialItems={latestItems} />
        <div className="text-center mt-6 md:mt-8">
            <Link href="/browse">
            <Button variant="secondary" size="lg">Voir tous les articles</Button>
            </Link>
        </div>
    </section>
  );
}
