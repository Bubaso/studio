
"use client";

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ItemCard } from '@/components/item-card';
import type { Item, ItemCategory, ItemCondition } from '@/lib/types';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from '@/components/ui/skeleton';
import { FilterControls } from '@/components/filter-controls';
import { getItemsFromFirestore } from '@/services/itemService';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 50;

// ActiveFilters component displays current filters as removable badges
function ActiveFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    const activeFilters: { key: string; label: string; value: string }[] = [];

    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const condition = searchParams.get('condition');
    const location = searchParams.get('location');

    if (category) activeFilters.push({ key: 'category', label: 'Catégorie', value: category });
    if (minPrice && minPrice !== '0') activeFilters.push({ key: 'minPrice', label: 'Prix Min', value: `${parseInt(minPrice, 10).toLocaleString('fr-FR')} XOF` });
    if (maxPrice && maxPrice !== '500000') activeFilters.push({ key: 'maxPrice', label: 'Prix Max', value: `${parseInt(maxPrice, 10).toLocaleString('fr-FR')} XOF` });
    if (condition) activeFilters.push({ key: 'condition', label: 'État', value: condition.charAt(0).toUpperCase() + condition.slice(1) });
    if (location) activeFilters.push({ key: 'location', label: 'Lieu', value: location });

    if (activeFilters.length === 0) {
        return null;
    }

    const removeFilter = (key: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.delete(key);
        router.push(`${pathname}?${params.toString()}`);
    };
    
    const clearAllFilters = () => {
         const params = new URLSearchParams(searchParams.toString());
         const query = params.get('q'); // Preserve search query
         const newParams = new URLSearchParams();
         if (query) newParams.set('q', query);
         router.push(`${pathname}?${newParams.toString()}`);
    }

    return (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Filtres actifs:</span>
            {activeFilters.map(filter => (
                <Badge key={filter.key} variant="secondary" className="pl-2 pr-1 py-1 text-sm">
                    {filter.label}: {filter.value}
                    <button onClick={() => removeFilter(filter.key)} className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20">
                        <X className="h-3 w-3" />
                        <span className="sr-only">Retirer le filtre {filter.label}</span>
                    </button>
                </Badge>
            ))}
             <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-primary hover:text-primary underline">
                Tout effacer
            </Button>
        </div>
    );
}

// ItemGrid component - no longer takes searchParams prop
function ItemGrid() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [pageData, setPageData] = useState<{ items: Item[]; lastItemId: string | null; hasMore: boolean }>({ items: [], lastItemId: null, hasMore: false });
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
            pageSize: ITEMS_PER_PAGE,
            lastVisibleItemId: cursor ?? undefined,
        });

        const finalItems = currentUser
          ? result.items.filter((item) => item.sellerId !== currentUser.uid)
          : result.items;

        setPageData({ items: finalItems, lastItemId: result.lastItemId, hasMore: result.hasMore });

        if (result.hasMore && result.lastItemId && !cursors.includes(result.lastItemId)) {
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
        setPageData({ items: [], lastItemId: null, hasMore: false });
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

  const { items, hasMore } = pageData;

  if (isLoading && items.length === 0) {
    return <ItemGridSkeleton />;
  }

  const handleNextPage = () => {
    if(hasMore) {
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
          {(pageNumber > 1 || hasMore) && (
            <Pagination className="mt-8">
              <PaginationContent>
                {pageNumber > 1 && (
                  <PaginationPrevious onClick={handlePrevPage} />
                )}
                <PaginationItem>
                   <Button variant="outline" size="icon" disabled>{pageNumber}</Button>
                </PaginationItem>
                {hasMore && (
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const actualSearchParams = useSearchParams(); // Use hook for pageTitle

  const queryParam = actualSearchParams.get('q');
  const categoryParam = actualSearchParams.get('category') as ItemCategory | null;

  const pageTitle = queryParam
    ? `Résultats pour "${queryParam}"`
    : categoryParam
    ? `Parcourir ${categoryParam}`
    : 'Parcourir tous les articles';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold font-headline text-primary">{pageTitle}</h1>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                  <Button variant="outline">
                      <Filter className="mr-2 h-4 w-4" />
                      Filtres
                  </Button>
              </SheetTrigger>
              <SheetContent>
                  <SheetHeader>
                      <SheetTitle>Filtres de recherche</SheetTitle>
                  </SheetHeader>
                  <FilterControls onApplied={() => setIsSheetOpen(false)} />
              </SheetContent>
          </Sheet>
      </div>
      
      <ActiveFilters />

      <Suspense fallback={<ItemGridSkeleton />}>
        <ItemGrid />
      </Suspense>
    </div>
  );
}
