"use client";

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, ShoppingBag, MessageCircleHeart, PlusCircle } from 'lucide-react';

const onboardingCards = [
    {
      icon: null,
      title: "Votre Marché d'Occasion",
      description: "Achetez et vendez des articles uniques et donnez une seconde vie à vos objets.",
      buttons: true,
    },
    {
      icon: <Search className="h-8 w-8 text-primary" />,
      title: "Découvrez",
      description: "Explorez des milliers d'articles uniques mis en vente par des vendeurs.",
      buttons: false,
    },
    {
      icon: <ShoppingBag className="h-8 w-8 text-primary" />,
      title: "Vendez Facilement",
      description: "Mettez en vente vos articles en quelques clics et fixez votre prix.",
      buttons: false,
    },
    {
      icon: <MessageCircleHeart className="h-8 w-8 text-primary" />,
      title: "Connectez-vous",
      description: "Communiquez directement avec les acheteurs et vendeurs via messagerie.",
      buttons: false,
    },
  ];

export function HeroOnboarding() {
    return (
        <section className="py-4 md:py-6 -mx-4 sm:-mx-6 lg:-mx-8">
            <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide px-4 sm:px-6 lg:px-8">
            {onboardingCards.map((card, index) => (
                <Card key={index} className="flex-shrink-0 w-[85vw] max-w-xs md:w-96 flex flex-col text-center items-center justify-center p-6 bg-card hover:shadow-xl transition-shadow duration-300">
                {card.icon && (
                    <div className="p-3 bg-primary/10 rounded-full inline-block mb-4">
                    {card.icon}
                    </div>
                )}
                <h1 className={`font-headline ${card.buttons ? 'text-2xl sm:text-3xl text-primary font-bold' : 'text-xl font-semibold'} mb-2`}>
                    {card.title}
                </h1>
                <p className="text-muted-foreground text-sm flex-grow mb-4">
                    {card.description}
                </p>
                {card.buttons && (
                    <div className="mt-auto flex flex-col sm:flex-row gap-3 w-full">
                    <Link href="/sell" className="flex-1">
                        <Button size="lg" variant="default" className="w-full">
                        <PlusCircle className="mr-2 h-5 w-5" /> Vendre
                        </Button>
                    </Link>
                    <Link href="/browse" className="flex-1">
                        <Button size="lg" variant="outline" className="w-full">
                        <Search className="mr-2 h-5 w-5" /> Explorer
                        </Button>
                    </Link>
                    </div>
                )}
                </Card>
            ))}
            </div>
            <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
                display: none;
            }
            .scrollbar-hide {
                -ms-overflow-style: none; /* IE and Edge */
                scrollbar-width: none; /* Firefox */
            }
            `}</style>
      </section>
    );
}
