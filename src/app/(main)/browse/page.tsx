
import { ItemCard } from '@/components/item-card';
import type { Item, ItemCategory, ItemCondition } from '@/lib/types'; // ItemCondition was missing
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { FilterControls } from '@/components/filter-controls';
import { getItemsFromFirestore } from '@/services/itemService'; // To fetch actual items

const ITEMS_PER_PAGE = 12;

interface BrowsePageProps {
  searchParams: {
    q?: string;
    category?: ItemCategory;
    minPrice?: string;
    maxPrice?: string;
    location?: string;
    condition?: ItemCondition; // Changed from string
    page?: string;
  };
}

async function ItemGrid({ searchParams }: { searchParams: BrowsePageProps['searchParams'] }) {
  // For now, ItemGrid will fetch all items based on filters, pagination is illustrative
  // Actual pagination would require more complex server-side logic or client-side slicing
  const items = await getItemsFromFirestore({
    query: searchParams.q,
    category: searchParams.category,
    priceMin: searchParams.minPrice ? parseInt(searchParams.minPrice) : undefined,
    priceMax: searchParams.maxPrice ? parseInt(searchParams.maxPrice) : undefined,
    location: searchParams.location,
    condition: searchParams.condition,
    // count: ITEMS_PER_PAGE, // Removed for now, full pagination is more complex
    // page: searchParams.page ? parseInt(searchParams.page) : 1
  });

  const currentPage = parseInt(searchParams.page || '1');
  // Since we are fetching all matching items for now, pagination logic below is for display structure
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = items.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex-1">
      {items.length > 0 ? (
        <>
          <p className="mb-4 text-muted-foreground">
            Affichage de {paginatedItems.length} sur {items.length} articles
            {searchParams.q && ` pour "${searchParams.q}"`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationPrevious href={`/browse?${new URLSearchParams({...searchParams, page: (currentPage - 1).toString()})}`} />
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink 
                      href={`/browse?${new URLSearchParams({...searchParams, page: page.toString()})}`}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {currentPage < totalPages && (
                  <PaginationNext href={`/browse?${new URLSearchParams({...searchParams, page: (currentPage + 1).toString()})}`} />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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


export default function BrowsePage({ searchParams }: BrowsePageProps) {
  const pageTitle = searchParams.q 
    ? `Résultats pour "${searchParams.q}"` 
    : searchParams.category 
    ? `Parcourir ${searchParams.category}`
    : 'Parcourir tous les articles';

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold font-headline text-primary">{pageTitle}</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <FilterControls />
        <Suspense fallback={<ItemGridSkeleton />}>
          <ItemGrid searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
