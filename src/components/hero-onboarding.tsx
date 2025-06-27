'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { storage } from '@/lib/firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';

// Original static slide data
const onboardingSlidesData = [
    {
      title: "Votre Marché d'Occasion",
      description: "Achetez et vendez des articles uniques et donnez une seconde vie à vos objets.",
    },
    {
      title: "Découvrez",
      description: "Explorez des milliers d'articles mis en vente par des vendeurs.",
    },
    {
      title: "Vendez Facilement",
      description: "Mettez en vente vos articles en quelques clics et fixez votre prix.",
    },
    {
      title: "Connectez-vous",
      description: "Communiquez directement avec les acheteurs et vendeurs via messagerie.",
    },
];

// Interface for media fetched from Firebase Storage
interface PromotionalMedia {
  type: 'video' | 'image';
  url: string;
  fileName: string;
}

// Interface for the final combined slide object
interface OnboardingSlide {
    title: string;
    description: string;
    mediaUrl?: string;
    mediaType?: 'video' | 'image';
}

export function HeroOnboarding() {
    const [mediaItems, setMediaItems] = useState<PromotionalMedia[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);

    // Fetch media from storage on component mount
    useEffect(() => {
      const fetchMedia = async () => {
        if (!storage) {
          console.warn("Firebase Storage is not initialized, cannot fetch promotional media for Hero.");
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        try {
          const listRef = ref(storage, 'promotional-gallery');
          const res = await listAll(listRef);
          
          if (res.items.length === 0) {
              setMediaItems([]);
              setIsLoading(false);
              return;
          }

          const fetchedMediaPromises = res.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            const name = itemRef.name.toLowerCase();
            const type = name.includes('video') ? 'video' : 'image';
            
            return { type, url, fileName: itemRef.name };
          });

          const unsortedMedia = await Promise.all(fetchedMediaPromises);
          const sortedMedia = unsortedMedia.sort((a, b) => a.fileName.localeCompare(b.fileName));
          
          setMediaItems(sortedMedia);

        } catch (error) {
          console.error("Error fetching hero gallery from Storage:", error);
          setMediaItems([]);
        } finally {
          setIsLoading(false);
        }
      };

      fetchMedia();
    }, []);

    // Combine static text with dynamic media URLs
    const slides = React.useMemo((): OnboardingSlide[] => {
        if (isLoading || mediaItems.length < 4) {
            return onboardingSlidesData;
        }

        // User's requested mapping:
        // slide 1 (index 0) -> 01_image (mediaItems[0])
        // slide 2 (index 1) -> 03_image (mediaItems[2])
        // slide 3 (index 2) -> 02_image (mediaItems[1])
        // slide 4 (index 3) -> 04_image (mediaItems[3])
        const mediaMap: { [key: number]: PromotionalMedia } = {
            0: mediaItems[0], // 01_image.png
            1: mediaItems[2], // 03_image.png
            2: mediaItems[1], // 02_image.png
            3: mediaItems[3], // 04_image.png
        };

        return onboardingSlidesData.map((slide, index) => {
            const media = mediaMap[index];
            return {
                ...slide,
                mediaUrl: media?.url,
                mediaType: media?.type,
            };
        });
    }, [isLoading, mediaItems]);

    // Function to handle slide transition with fade effect
    const goToSlide = (index: number) => {
        if (index === currentIndex) return;
        setIsFading(true);
        setTimeout(() => {
            setCurrentIndex(index);
            setIsFading(false);
        }, 300); // Animation duration
    };

    // Auto-advance the carousel
    useEffect(() => {
        const interval = setInterval(() => {
            const nextIndex = (currentIndex + 1) % slides.length;
            goToSlide(nextIndex);
        }, 5000); // Change slide every 5 seconds

        return () => clearInterval(interval);
    }, [currentIndex, slides.length]);
    
    // Render a skeleton loader while fetching media
    if (isLoading) {
        return <Skeleton className="w-full rounded-lg min-h-[210px] sm:min-h-[300px]" />;
    }

    return (
        <section 
            className="relative bg-card border rounded-lg shadow-sm overflow-hidden min-h-[210px] sm:min-h-[300px] flex flex-col justify-center items-center"
        >
            {/* Background Media Layer */}
            {slides.map((slide, index) => (
                <div key={index} className={cn(
                    "absolute inset-0 transition-opacity duration-500 z-0",
                    currentIndex === index ? "opacity-100" : "opacity-0"
                )}>
                    {slide.mediaUrl && (
                        <Image
                            src={slide.mediaUrl}
                            alt={slide.title}
                            fill
                            className="object-cover"
                            priority={index < 2}
                        />
                    )}
                </div>
            ))}
            
            {/* Darkening Overlay */}
            <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />

            {/* Text Content Layer */}
            <div className="relative z-20 flex flex-col text-center items-center justify-center p-6 text-white">
                <div 
                    className={cn(
                        "transition-opacity duration-300 w-full",
                        isFading ? "opacity-0" : "opacity-100"
                    )}
                >
                    <h1 className="font-headline text-2xl sm:text-3xl font-bold mb-2 drop-shadow-md">
                        {slides[currentIndex].title}
                    </h1>
                    <p className="text-lg max-w-md mx-auto drop-shadow-sm">
                        {slides[currentIndex].description}
                    </p>
                </div>
             </div>
            
            {/* Navigation Dots */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 p-4 z-20">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent background click when clicking dots
                            goToSlide(index);
                        }}
                        className={cn(
                            "h-2.5 w-2.5 rounded-full transition-all duration-300",
                            currentIndex === index ? "w-8 bg-white" : "bg-white/50 hover:bg-white"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}
