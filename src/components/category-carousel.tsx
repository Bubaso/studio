
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import React, { useRef, useState, useEffect } from 'react';
import { storage } from '@/lib/firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { Skeleton } from './ui/skeleton';

interface CarouselCategory {
  name: string;
  link: string;
  dataAiHint?: string;
  imageUrl?: string; // Optional, will be populated on the client
}

interface CategoryCarouselProps {
  categories: Omit<CarouselCategory, 'imageUrl'>[];
}

function CategoryCardSkeleton() {
    return (
        <div className="flex-shrink-0 w-32 sm:w-36 md:w-40">
             <Card className="overflow-hidden h-full">
                <Skeleton className="w-full aspect-[4/3] bg-muted" />
                <CardContent className="p-2">
                    <Skeleton className="h-4 w-3/4 mx-auto bg-muted" />
                </CardContent>
             </Card>
        </div>
    )
}

export function CategoryCarousel({ categories }: CategoryCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [categoriesWithUrls, setCategoriesWithUrls] = useState<CarouselCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchImageUrls = async () => {
      if (!storage) {
          console.warn("Firebase Storage is not initialized, cannot fetch category images.");
          setCategoriesWithUrls(categories.map(c => ({...c, imageUrl: ''})));
          setIsLoading(false);
          return;
      }
      
      try {
        const listRef = ref(storage, 'category-images');
        const res = await listAll(listRef);
        const urlMap = new Map<string, string>();
        
        await Promise.all(res.items.map(async (itemRef) => {
          try {
            const url = await getDownloadURL(itemRef);
            const normalizedName = itemRef.name
              .replace(/\.(png|jpg|jpeg|webp)$/i, '')
              .toLowerCase();
            urlMap.set(normalizedName, url);
          } catch (urlError) {
             console.error(`Failed to get download URL for ${itemRef.name}`, urlError);
          }
        }));

        const updatedCategories = categories.map(category => ({
          ...category,
          imageUrl: urlMap.get(category.name.toLowerCase()) || '',
        }));
        
        setCategoriesWithUrls(updatedCategories);
      } catch (error) {
        console.error("Error listing category images from Storage:", error);
        setCategoriesWithUrls(categories.map(c => ({...c, imageUrl: ''})));
      } finally {
        setIsLoading(false);
      }
    };

    fetchImageUrls();
  }, [categories]);

  useEffect(() => {
    const checkScrollability = () => {
      if (scrollContainerRef.current) {
        const { scrollWidth, clientWidth } = scrollContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
      }
    };

    if (!isLoading) {
        checkScrollability();
        window.addEventListener('resize', checkScrollability);
        const timeoutId = setTimeout(checkScrollability, 100);

        return () => {
          window.removeEventListener('resize', checkScrollability);
          clearTimeout(timeoutId);
        };
    }
  }, [isLoading, categoriesWithUrls]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -250 : 250;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (isLoading) {
     return (
        <div className="relative group/carousel">
            <div className="flex space-x-3 sm:space-x-4 overflow-x-auto py-2 sm:py-4 px-1 scrollbar-hide">
                {Array.from({ length: categories.length > 0 ? categories.length : 5 }).map((_, index) => (
                    <CategoryCardSkeleton key={index} />
                ))}
            </div>
        </div>
     )
  }

  return (
    <div className="relative group/carousel">
      <div
        ref={scrollContainerRef}
        className="flex space-x-3 sm:space-x-4 overflow-x-auto py-2 sm:py-4 px-1 scrollbar-hide overscroll-x-contain"
      >
        {categoriesWithUrls.map((category, index) => (
          <Link href={category.link} key={index} className="block flex-shrink-0 w-32 sm:w-36 md:w-40 group">
            <Card className="overflow-hidden h-full hover:shadow-lg transition-shadow duration-200 border-border hover:border-primary/50">
              <div className="relative w-full aspect-[4/3]">
                {category.imageUrl ? (
                  <Image
                    src={category.imageUrl}
                    alt={category.name}
                    fill
                    sizes="(max-width: 640px) 128px, (max-width: 768px) 144px, 160px"
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                    data-ai-hint={category.dataAiHint || category.name.toLowerCase()}
                    priority={index < 3}
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                )}
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
