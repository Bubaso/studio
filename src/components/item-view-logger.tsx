
"use client";

import { useEffect } from 'react';
import { logItemView } from '@/services/itemService';

interface ItemViewLoggerProps {
  itemId: string;
}

export function ItemViewLogger({ itemId }: ItemViewLoggerProps) {
  useEffect(() => {
    if (itemId) {
      console.log(`CLIENT: ItemViewLogger attempting to log view for itemId: ${itemId}`);
      logItemView(itemId)
        .then(() => {
          console.log(`CLIENT: logItemView call completed for ${itemId}. Check server logs for confirmation.`);
        })
        .catch(error => {
          console.error(`CLIENT: Error calling logItemView for ${itemId}:`, error);
        });
    } else {
      console.warn("CLIENT: ItemViewLogger - itemId is missing, view not logged.");
    }
  }, [itemId]);

  return null; // This component does not render anything
}
