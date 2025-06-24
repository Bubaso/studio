"use client";

import { useState, useEffect } from 'react';
import { Search, ShoppingBag, MessageCircleHeart } from 'lucide-react';
import { cn } from '@/lib/utils';

const onboardingSlides = [
    {
      icon: null,
      title: "Votre Marché d'Occasion",
      description: "Achetez et vendez des articles uniques et donnez une seconde vie à vos objets.",
    },
    {
      icon: <Search className="h-8 w-8 text-primary" />,
      title: "Découvrez",
      description: "Explorez des milliers d'articles uniques mis en vente par des vendeurs.",
    },
    {
      icon: <ShoppingBag className="h-8 w-8 text-primary" />,
      title: "Vendez Facilement",
      description: "Mettez en vente vos articles en quelques clics et fixez votre prix.",
    },
    {
      icon: <MessageCircleHeart className="h-8 w-8 text-primary" />,
      title: "Connectez-vous",
      description: "Communiquez directement avec les acheteurs et vendeurs via messagerie.",
    },
];

export function HeroOnboarding() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setCurrentIndex((prevIndex) => (prevIndex + 1) % onboardingSlides.length);
                setIsFading(false);
            }, 300); // Duration of fade-out animation
        }, 5000); // Change slide every 5 seconds

        return () => clearInterval(interval);
    }, []);
    
    const goToSlide = (index: number) => {
        if (index === currentIndex) return;
        setIsFading(true);
        setTimeout(() => {
            setCurrentIndex(index);
            setIsFading(false);
        }, 300);
    };

    const currentSlide = onboardingSlides[currentIndex];

    return (
        <section className="relative bg-card border rounded-lg shadow-sm overflow-hidden min-h-[250px] flex flex-col justify-center items-center">
             <div className="absolute top-0 left-0 w-full h-full flex flex-col text-center items-center justify-center p-6">
                <div 
                    className={cn(
                        "transition-opacity duration-300 w-full",
                        isFading ? "opacity-0" : "opacity-100"
                    )}
                >
                    {currentSlide.icon && (
                        <div className="p-3 bg-primary/10 rounded-full inline-block mb-4">
                            {currentSlide.icon}
                        </div>
                    )}
                    <h1 className="font-headline text-2xl sm:text-3xl text-primary font-bold mb-2">
                        {currentSlide.title}
                    </h1>
                    <p className="text-muted-foreground text-md max-w-md mx-auto">
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
