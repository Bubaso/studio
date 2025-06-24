"use client";

import { useState, useEffect } from 'react';
import type React from 'react';
import { cn } from '@/lib/utils';

const onboardingSlides = [
    {
      title: "Votre Marché d'Occasion",
      description: "Achetez et vendez des articles uniques et donnez une seconde vie à vos objets.",
    },
    {
      title: "Découvrez",
      description: "Explorez des milliers d'articles uniques mis en vente par des vendeurs.",
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

export function HeroOnboarding() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);

    // This handles the automatic slide change
    useEffect(() => {
        const interval = setInterval(() => {
            // Use goToSlide to ensure fade animation
            const nextIndex = (currentIndex + 1) % onboardingSlides.length;
            goToSlide(nextIndex);
        }, 5000); // Change slide every 5 seconds

        return () => clearInterval(interval);
    }, [currentIndex]); // Re-run effect when currentIndex changes to reset the timer
    
    const goToSlide = (index: number) => {
        if (index === currentIndex) return;
        setIsFading(true);
        setTimeout(() => {
            setCurrentIndex(index);
            setIsFading(false);
        }, 300); // Duration of fade-out animation
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStart === null) {
            return;
        }

        const touchEndX = e.changedTouches[0].clientX;
        const swipeDistance = touchStart - touchEndX;
        const minSwipeDistance = 50; // pixels

        if (swipeDistance > minSwipeDistance) {
            // Swipe left
            goToSlide((currentIndex + 1) % onboardingSlides.length);
        } else if (swipeDistance < -minSwipeDistance) {
            // Swipe right
            goToSlide((currentIndex - 1 + onboardingSlides.length) % onboardingSlides.length);
        }

        setTouchStart(null);
    };

    const currentSlide = onboardingSlides[currentIndex];

    return (
        <section 
            className="relative bg-card border rounded-lg shadow-sm overflow-hidden min-h-[210px] flex flex-col justify-center items-center"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
             <div className="absolute inset-0 flex flex-col text-center items-center justify-center p-6">
                <div 
                    className={cn(
                        "transition-opacity duration-300 w-full",
                        isFading ? "opacity-0" : "opacity-100"
                    )}
                >
                    <h1 className="font-headline text-2xl sm:text-3xl text-primary font-bold mb-2">
                        {currentSlide.title}
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                        {currentSlide.description}
                    </p>
                </div>
             </div>
            
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 p-4">
                {onboardingSlides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={cn(
                            "h-2.5 w-2.5 rounded-full transition-all duration-300",
                            currentIndex === index ? "w-8 bg-primary" : "bg-muted-foreground/50 hover:bg-muted-foreground"
                        )}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
}