
"use client"; // Make BrowsePage a client component

import { ItemCard } from '@/components/item-card';
import type { Item, ItemCategory, ItemCondition } from '@/lib/types';
import { Pagination, PaginationContent, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Suspense, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterControls } from '@/components/filter-controls';
import { getItemsFromFirestore } from '@/services/itemService';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 12;

// ItemGrid component - no longer takes searchParams prop
function ItemGrid() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);

  const actualSearchParams = useSearchParams(); // Use the hook in ItemGrid

  const queryParam = actualSearchParams.get('q');
  const categoryParam = actualSearchParams.get('category') as ItemCategory | null;
  const minPriceParam = actualSearchParams.get('minPrice');
  const maxPriceParam = actualSearchParams.get('maxPrice');
  const locationParam = actualSearchParams.get('location');
  const conditionParam = actualSearchParams.get('condition') as ItemCondition | null;
  const pageParam = actualSearchParams.get('page');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setInitialAuthCheckDone(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!initialAuthCheckDone) {
      return;
    }

    setIsLoading(true);
    getItemsFromFirestore({
      query: queryParam || undefined,
      category: categoryParam || undefined,
      priceMin: minPriceParam ? parseInt(minPriceParam) : undefined,
      priceMax: maxPriceParam ? parseInt(maxPriceParam) : undefined,
      location: locationParam || undefined,
      condition: conditionParam || undefined,
      excludeSellerId: currentUser?.uid,
    }).then(fetchedItems => {
      setItems(fetchedItems);
      setIsLoading(false);
    }).catch(error => {
      console.error("Error fetching items in ItemGrid:", error);
      setItems([]);
      setIsLoading(false);
    });
  }, [queryParam, categoryParam, minPriceParam, maxPriceParam, locationParam, conditionParam, currentUser, initialAuthCheckDone, pageParam]);

  if (isLoading && items.length === 0) {
    return <ItemGridSkeleton />;
  }

  const currentPage = parseInt(pageParam || '1');
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const buildPageUrl = (pageNumber: number) => {
    const newParams = new URLSearchParams(); // Standard URLSearchParams
    if (queryParam) newParams.set('q', queryParam);
    if (categoryParam) newParams.set('category', categoryParam);
    if (minPriceParam) newParams.set('minPrice', minPriceParam);
    if (maxPriceParam) newParams.set('maxPrice', maxPriceParam);
    if (locationParam) newParams.set('location', locationParam);
    if (conditionParam) newParams.set('condition', conditionParam);
    newParams.set('page', pageNumber.toString());
    return `/browse?${newParams.toString()}`;
  };

  return (
    <div className="flex-1">
      {isLoading && items.length === 0 ? (
         <ItemGridSkeleton />
      ) : items.length > 0 ? (
        <>
          <p className="mb-4 text-muted-foreground">
            Affichage de {paginatedItems.length} sur {items.length} articles
            {queryParam && ` pour "${queryParam}"`}
          </p>
          <div className="grid grid-cols-2 gap-6">
            {paginatedItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationPrevious href={buildPageUrl(currentPage - 1)} />
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href={buildPageUrl(page)}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {currentPage < totalPages && (
                  <PaginationNext href={buildPageUrl(currentPage + 1)} />
                )}
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : (
        <div className="text-center py-10">
          <h2 className="text-2xl font-semibold mb-2">Aucun article trouvé</h2>
          <p className="text-muted-foreground">Essayez d'ajuster vos filtres de recherche ou de rechercher autre chose.</p>
        </div>
      )}
    </div>
  );
}

function ItemGridSkeleton() {
  return (
    <div className="flex-1">
      <Skeleton className="h-6 w-1/4 mb-4" />
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </div>
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

// BrowsePage no longer receives searchParams prop
export default function BrowsePage() {
  const actualSearchParams = useSearchParams(); // Use hook for pageTitle

  const queryParam = actualSearchParams.get('q');
  const categoryParam = actualSearchParams.get('category') as ItemCategory | null;

  const pageTitle = queryParam
    ? `Résultats pour "${queryParam}"`
    : categoryParam
    ? `Parcourir ${categoryParam}`
    : 'Parcourir tous les articles';

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold font-headline text-primary">{pageTitle}</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <FilterControls /> {/* FilterControls already uses useSearchParams */}
        <Suspense fallback={<ItemGridSkeleton />}>
          <ItemGrid /> {/* ItemGrid no longer takes searchParams prop */}
        </Suspense>
      </div>
    </div>
  );
}
