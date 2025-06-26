
"use client";

import { useEffect } from 'react';
import { logItemView } from '@/services/itemService';
import type { Item } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

interface ItemViewLoggerProps {
  item: Item;
}

export function ItemViewLogger({ item }: ItemViewLoggerProps) {
  const { firebaseUser } = useAuth();

  useEffect(() => {
    if (item && item.id && firebaseUser) {
        // Don't log views for the item's own seller
        if (firebaseUser.uid === item.sellerId) {
            return;
        }
        
        console.log(`CLIENT: ItemViewLogger attempting to log view for itemId: ${item.id}`);
        // Pass the essential parts of the item for history logging
        const itemForHistory = {
            id: item.id,
            name: item.name,
            category: item.category,
            price: item.price,
            description: item.description.substring(0, 100), // Log a snippet
        };

        logItemView(item.id, firebaseUser.uid, itemForHistory)
            .then(() => {
            console.log(`CLIENT: logItemView call completed for ${item.id}. Check server logs for confirmation.`);
            })
            .catch(error => {
            console.error(`CLIENT: Error calling logItemView for ${item.id}:`, error);
            });
    } else {
      console.warn("CLIENT: ItemViewLogger - item, itemId, or user is missing, view not logged.");
    }
  }, [item, firebaseUser]);

  return null; // This component does not render anything
}
