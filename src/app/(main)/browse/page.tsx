
import { ItemCard } from '@/components/item-card';
import { getItemsFromFirestore } from '@/services/itemService'; // Updated import
import type { Item, ItemCategory } from '@/lib/types';
import { FilterControls } from '@/components/filter-controls';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 12;

interface BrowsePageProps {
  searchParams: {
    q?: string;
    category?: ItemCategory;
    minPrice?: string;
    maxPrice?: string;
    location?: string;
    condition?: string;
    page?: string;
  };
}

async function ItemGrid({ searchParams }: { searchParams: BrowsePageProps['searchParams'] }) {
  const filters = {
    query: searchParams.q,
    category: searchParams.category,
    priceMin: searchParams.minPrice ? parseInt(searchParams.minPrice) : undefined,
    priceMax: searchParams.maxPrice ? parseInt(searchParams.maxPrice) : undefined,
    location: searchParams.location,
    condition: searchParams.condition,
  };

  // Fetch items from Firestore
  const allItems: Item[] = await getItemsFromFirestore(filters);
  const currentPage = parseInt(searchParams.page || '1');
  const totalPages = Math.ceil(allItems.length / ITEMS_PER_PAGE);
  const paginatedItems = allItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="flex-1">
      {allItems.length > 0 ? (
        <>
          <p className="mb-4 text-muted-foreground">Affichage de {paginatedItems.length} sur {allItems.length} articles</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                {currentPage > 1 && (
                  <PaginationItem>
                    <PaginationPrevious 
                      href={`/browse?${new URLSearchParams({...searchParams, page: (currentPage - 1).toString()}).toString()}`} 
                      aria-label="Page précédente"
                    />
                  </PaginationItem>
                )}
                
                {Array.from({ length: totalPages }, (_, i) => {
                  const pageNumber = i + 1;
                  const showEllipsisBefore = currentPage > 3 && pageNumber === 1 && totalPages > 5;
                  const showEllipsisAfter = currentPage < totalPages - 2 && pageNumber === totalPages && totalPages > 5;

                  if (totalPages > 5) {
                    // Always show first page
                    if (pageNumber === 1) {
                       return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink 
                            href={`/browse?${new URLSearchParams({...searchParams, page: pageNumber.toString()}).toString()}`}
                            isActive={currentPage === pageNumber}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                     // Ellipsis after first page if current page is far
                    if (currentPage > 3 && pageNumber === 2) {
                      return <PaginationEllipsis key={`ellipsis-start-${pageNumber}`} />;
                    }
                    // Show pages around current page
                    if (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1) {
                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink 
                            href={`/browse?${new URLSearchParams({...searchParams, page: pageNumber.toString()}).toString()}`}
                            isActive={currentPage === pageNumber}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    // Ellipsis before last page if current page is far
                    if (currentPage < totalPages - 2 && pageNumber === totalPages -1) {
                       return <PaginationEllipsis key={`ellipsis-end-${pageNumber}`} />;
                    }
                     // Always show last page
                    if (pageNumber === totalPages) {
                       return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink 
                            href={`/browse?${new URLSearchParams({...searchParams, page: pageNumber.toString()}).toString()}`}
                            isActive={currentPage === pageNumber}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                    return null; // Don't render other pages in condensed view
                  } else {
                     // Show all pages if total pages is 5 or less
                     return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink 
                            href={`/browse?${new URLSearchParams({...searchParams, page: pageNumber.toString()}).toString()}`}
                            isActive={currentPage === pageNumber}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                  }
                })}

                {currentPage < totalPages && (
                  <PaginationItem>
                    <PaginationNext 
                      href={`/browse?${new URLSearchParams({...searchParams, page: (currentPage + 1).toString()}).toString()}`} 
                      aria-label="Page suivante"
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </>
      ) : (
        <div className="text-center py-10">
          <h2 className="text-2xl font-semibold mb-2">Aucun article trouvé</h2>
          <p className="text-muted-foreground">Essayez d'ajuster vos filtres ou termes de recherche. Assurez-vous que votre base de données Firestore contient des articles.</p>
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
    <div className="border rounded-lg p-4 space-y-3">
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-10 w-full mt-2" />
    </div>
  );
}


export default function BrowsePage({ searchParams }: BrowsePageProps) {
  const pageTitle = searchParams.q 
    ? `Résultats de recherche pour "${searchParams.q}"` 
    : searchParams.category 
    ? `Parcourir ${searchParams.category}`
    : 'Parcourir tous les articles';

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold font-headline">{pageTitle}</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <FilterControls />
        <Suspense fallback={<ItemGridSkeleton />}>
          <ItemGrid searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
