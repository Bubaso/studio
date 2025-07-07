
'use client';

import { useEffect, useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { getViewCount } from '@/services/itemService';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


interface ItemViewCountProps {
  itemId: string;
  className?: string;
}

export function ItemViewCount({ itemId, className }: ItemViewCountProps) {
  const [viewCount, setViewCount] = useState<number | null>(null);

  useEffect(() => {
    if (itemId) {
      if(itemId.length < 5) return; 
      getViewCount(itemId)
        .then(setViewCount)
        .catch(err => {
          console.error(`Error fetching view count for ${itemId}:`, err);
          setViewCount(0);
        });
    }
  }, [itemId]);
  
  if (viewCount === null || viewCount === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("bg-background/70 backdrop-blur-sm pointer-events-none", className)}>
            <Eye className="h-3.5 w-3.5" />
            <span className="ml-1 font-medium tabular-nums">{viewCount}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{viewCount} vues</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
