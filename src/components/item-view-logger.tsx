
"use client";

import { useEffect } from 'react';
import { logItemView } from '@/services/itemService';

interface ItemViewLoggerProps {
  itemId: string;
}

export function ItemViewLogger({ itemId }: ItemViewLoggerProps) {
  useEffect(() => {
    if (itemId) {
      // Basic check to prevent logging if component re-renders rapidly without itemId changing.
      // More sophisticated view logging (e.g., once per user session) would require more state.
      logItemView(itemId);
    }
  }, [itemId]);

  return null; // This component does not render anything
}
