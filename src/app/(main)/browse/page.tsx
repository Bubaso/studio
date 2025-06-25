
"use client"; // Make BrowsePage a client component

import { ItemCard } from '@/components/item-card';
import type { Item, ItemCategory, ItemCondition } from '@/lib/types';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Suspense, useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterControls } from '@/components/filter-controls';
import { getItemsFromFirestore } from '@/services/itemService';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useSearchParams } from 'next/navigation'; // Import useSearchParams
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 12;

// ItemGrid component - no longer takes searchParams prop
function ItemGrid() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [pageData, setPageData] = useState<{ items: Item[]; lastItemId: string | null }>({ items: [], lastItemId: null });
  const [isLoading, setIsLoading] = useState(true);
  const [initialAuthCheckDone, setInitialAuthCheckDone] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [cursors, setCursors] = useState<(string|null)[]>([null]);

  const actualSearchParams = useSearchParams();

  // Rebuild the filter params for dependencies and fetching
  const queryParam = actualSearchParams.get('q');
  const categoryParam = actualSearchParams.get('category') as ItemCategory | null;
  const minPriceParam = actualSearchParams.get('minPrice');
  const maxPriceParam = actualSearchParams.get('maxPrice');
  const locationParam = actualSearchParams.get('location');
  const conditionParam = actualSearchParams.get('condition') as ItemCondition | null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setInitialAuthCheckDone(true);
    });
    return () => unsubscribe();
  }, []);

  // Effect to reset pagination when filters change
  useEffect(() => {
    setPageNumber(1);
    setCursors([null]);
  }, [queryParam, categoryParam, minPriceParam, maxPriceParam, locationParam, conditionParam]);

  useEffect(() => {
    if (!initialAuthCheckDone) return;

    const fetchPageData = async () => {
        setIsLoading(true);
        const cursor = cursors[pageNumber - 1];

        const result = await getItemsFromFirestore({
            query: queryParam || undefined,
            category: categoryParam || undefined,
            priceMin: minPriceParam ? parseInt(minPriceParam) : undefined,
            priceMax: maxPriceParam ? parseInt(maxPriceParam) : undefined,
            location: locationParam || undefined,
            condition: conditionParam || undefined,
            excludeSellerId: currentUser?.uid,
            pageSize: ITEMS_PER_PAGE,
            lastVisibleItemId: cursor ?? undefined,
        });

        setPageData(result);

        if (result.lastItemId && !cursors.includes(result.lastItemId)) {
          setCursors(prev => {
             const newCursors = [...prev];
             newCursors[pageNumber] = result.lastItemId;
             return newCursors;
          });
        }
        
        setIsLoading(false);
    };

    fetchPageData().catch(error => {
        console.error("Error fetching items in ItemGrid:", error);
        setPageData({ items: [], lastItemId: null });
        setIsLoading(false);
    });

  }, [
    pageNumber,
    currentUser, 
    initialAuthCheckDone, 
    queryParam, 
    categoryParam, 
    minPriceParam, 
    maxPriceParam, 
    locationParam, 
    conditionParam
  ]);

  const { items, lastItemId } = pageData;

  if (isLoading && items.length === 0) {
    return <ItemGridSkeleton />;
  }

  const handleNextPage = () => {
    if(lastItemId) {
      setPageNumber(prev => prev + 1);
    }
  }

  const handlePrevPage = () => {
    setPageNumber(prev => Math.max(1, prev - 1));
  }


  return (
    <div className="flex-1">
      {isLoading ? (
         <ItemGridSkeleton />
      ) : items.length > 0 ? (
        <>
          <p className="mb-4 text-muted-foreground">
            Affichage de {items.length} articles
            {queryParam && ` pour "${queryParam}"`}
          </p>
          <div className="grid grid-cols-2 gap-6">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          {(pageNumber > 1 || lastItemId) && (
            <Pagination className="mt-8">
              <PaginationContent>
                {pageNumber > 1 && (
                  <PaginationPrevious onClick={handlePrevPage} />
                )}
                <PaginationItem>
                   <Button variant="outline" size="icon" disabled>{pageNumber}</Button>
                </PaginationItem>
                {lastItemId && (
                  <PaginationNext onClick={handleNextPage} />
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
