
"use client";

import { ItemCard } from '@/components/item-card';
import type { Item } from '@/lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useRef, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface SimilarListingsCarouselProps {
  items: Item[];
  currentItemId: string; 
}

export function SimilarListingsCarousel({ items: initialItems, currentItemId }: SimilarListingsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const { firebaseUser: currentUser, authLoading } = useAuth();
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!authLoading) {
      let displayItems = initialItems.filter(item => item.id !== currentItemId); 
      if (currentUser) {
        displayItems = displayItems.filter(item => item.sellerId !== currentUser.uid); 
      }
      setFilteredItems(displayItems);
    }
  }, [initialItems, currentUser, currentItemId, authLoading]);

  useEffect(() => {
    const checkScrollability = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };

    if (filteredItems.length > 0) {
        checkScrollability();
        window.addEventListener('resize', checkScrollability);
        const timeoutId = setTimeout(checkScrollability, 100);

        return () => {
          window.removeEventListener('resize', checkScrollability);
          clearTimeout(timeoutId);
        };
    } else {
        setShowScrollButtons(false);
    }
  }, [filteredItems]); 

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300; 
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (authLoading || filteredItems.length === 0) {
    return null;
  }

  return (
    <div className="relative group/carousel">
      <div
        ref={scrollContainerRef}
        className="flex space-x-3 sm:space-x-4 overflow-x-auto py-2 sm:py-4 px-1 scrollbar-hide overscroll-x-contain"
      >
        {filteredItems.map((item) => (
          <div key={item.id} className="w-56 sm:w-60 md:w-64 flex-shrink-0 h-full">
            <ItemCard item={item} />
          </div>
        ))}
      </div>
      {showScrollButtons && (
        <>
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 sm:p-2 bg-background/60 hover:bg-background/90 rounded-full shadow-md transition-opacity opacity-0 group-hover/carousel:opacity-100 focus:opacity-100 md:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 sm:p-2 bg-background/60 hover:bg-background/90 rounded-full shadow-md transition-opacity opacity-0 group-hover/carousel:opacity-100 focus:opacity-100 md:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
          </button>
        </>
      )}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>
    </div>
  );
}
