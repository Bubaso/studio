
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useRef } from 'react';

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

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative">
      <div
        ref={scrollContainerRef}
        className="flex space-x-4 overflow-x-auto py-4 px-1 scrollbar-hide"
      >
        {categories.map((category, index) => (
          <Link href={category.link} key={index} className="block flex-shrink-0 w-36 sm:w-40 md:w-48 group">
            <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-200 border-border hover:border-primary/50">
              <div className="relative w-full aspect-[4/3]">
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  sizes="(max-width: 640px) 144px, (max-width: 768px) 160px, 192px"
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  data-ai-hint={category.dataAiHint || category.name.toLowerCase()}
                />
              </div>
              <CardContent className="p-2 sm:p-3 text-center">
                <h3 className="text-sm sm:text-base font-semibold font-headline truncate group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {categories.length > 3 && ( // Show scroll buttons only if there's enough content to scroll
        <>
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-background/70 hover:bg-background/90 rounded-full shadow-md transition-opacity opacity-0 group-hover/carousel:opacity-100 md:opacity-100"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6 text-foreground" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-background/70 hover:bg-background/90 rounded-full shadow-md transition-opacity opacity-0 group-hover/carousel:opacity-100 md:opacity-100"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-6 w-6 text-foreground" />
          </button>
        </>
      )}
       {/* Styling for hiding scrollbar, Tailwind plugin might be needed for full cross-browser support */}
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

// Add group-hover for carousel to show buttons on hover
// To make this work you might need to wrap the CategoryCarousel component usage
// in a div with class="group/carousel" in page.tsx if it's not already implied.
// For now, the buttons are made md:opacity-100 to be visible on desktop.
// If the parent container in page.tsx has 'group/carousel', the hover effect will work.
// Updated button opacity:
// opacity-0 group-hover/carousel:opacity-100 md:opacity-100
// This means buttons are hidden, show on carousel hover, and are always visible on md+ screens.
// If you want them to appear on hover on md+ screens too, remove md:opacity-100.
// Example usage if buttons don't appear on hover:
// <div className="group/carousel"> <CategoryCarousel categories={...} /> </div>
// However, in this case, the relative positioning inside CategoryCarousel should allow it to work.
