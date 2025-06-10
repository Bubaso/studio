
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useRef, useState, useEffect } from 'react';

interface CarouselCategory {
  name: string;
  imageUrl: string;
  link: string;
  dataAiHint?: string;
}

interface CategoryCarouselProps {
  categories: CarouselCategory[];
}

export function CategoryCarousel({ categories }: CategoryCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);

  useEffect(() => {
    const checkScrollability = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };

    checkScrollability();
    // Add event listener for window resize to re-check scrollability
    window.addEventListener('resize', checkScrollability);
    // Check again after a short delay for initial render and dynamic content
    const timeoutId = setTimeout(checkScrollability, 100);

    return () => {
      window.removeEventListener('resize', checkScrollability);
      clearTimeout(timeoutId);
    };
  }, [categories]); // Re-check if categories change

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group/carousel">
      <div
        ref={scrollContainerRef}
        className="flex space-x-3 sm:space-x-4 overflow-x-auto py-2 sm:py-4 px-1 scrollbar-hide overscroll-x-contain"
      >
        {categories.map((category, index) => (
          <Link href={category.link} key={index} className="block flex-shrink-0 w-32 sm:w-36 md:w-40 group">
            <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-200 border-border hover:border-primary/50">
              <div className="relative w-full aspect-[4/3]">
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, 160px"
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  data-ai-hint={category.dataAiHint || category.name.toLowerCase()}
                />
              </div>
              <CardContent className="p-2 text-center">
                <h3 className="text-xs sm:text-sm font-semibold font-headline truncate group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
              </CardContent>
            </Card>
          </Link>
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
