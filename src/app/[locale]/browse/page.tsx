
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import BrowsePageContent from './browse-page-content';

function BrowsePageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <Skeleton className="h-10 w-64" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="mt-4">
        <Skeleton className="h-6 w-1/4 mb-4" />
      </div>
      <div className="flex-1">
        <Skeleton className="h-6 w-1/4 mb-4" />
        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="border rounded-lg p-4 space-y-3 shadow-sm bg-card" key={index}>
              <Skeleton className="h-40 w-full bg-muted/50" />
              <Skeleton className="h-6 w-3/4 bg-muted/50" />
              <Skeleton className="h-8 w-1/2 bg-muted/50" />
              <Skeleton className="h-4 w-1/2 bg-muted/50" />
              <Skeleton className="h-4 w-1/3 bg-muted/50" />
              <Skeleton className="h-10 w-full mt-2 bg-muted/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<BrowsePageSkeleton />}>
      <BrowsePageContent />
    </Suspense>
  );
}
