
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
            <Skeleton className="h-7 w-40 mb-2" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-24 mt-1" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
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
