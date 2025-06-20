
"use client";

import { ItemCard } from '@/components/item-card';
import type { Item } from '@/lib/types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useRef, useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

interface SimilarListingsCarouselProps {
  items: Item[];
  currentItemId: string; 
}

export function SimilarListingsCarousel({ items: initialItems, currentItemId }: SimilarListingsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [authCheckCompleted, setAuthCheckCompleted] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthCheckCompleted(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authCheckCompleted) return; // Wait for auth check

    let displayItems = initialItems.filter(item => item.id !== currentItemId); 
    if (currentUser) {
      displayItems = displayItems.filter(item => item.sellerId !== currentUser.uid); 
    }
    setFilteredItems(displayItems);
  }, [initialItems, currentUser, currentItemId, authCheckCompleted]);

  useEffect(() => {
    const checkScrollability = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };

    if (filteredItems.length > 0) { // Only check if there are items to scroll
        checkScrollability();
        window.addEventListener('resize', checkScrollability);
        const timeoutId = setTimeout(checkScrollability, 100); // For dynamic content

        return () => {
        window.removeEventListener('resize', checkScrollability);
        clearTimeout(timeoutId);
        };
    } else {
        setShowScrollButtons(false); // No buttons if no items
    }
  }, [filteredItems]); 

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300; 
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!filteredItems || filteredItems.length === 0) {
    return null;
  }

  return (
    <div className="relative group/carousel">
      <div
        ref={scrollContainerRef}
        className="flex space-x-3 sm:space-x-4 overflow-x-auto py-2 sm:py-4 px-1 scrollbar-hide overscroll-x-contain"
      >
        {filteredItems.map((item) => (
          <div key={item.id} className="w-56 sm:w-60 md:w-64 flex-shrink-0 h-full"> {/* Slightly smaller width for carousel context */}
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
