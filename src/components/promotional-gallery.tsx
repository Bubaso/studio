
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';

interface PromotionalMedia {
  type: 'video' | 'image';
  url: string;
  title: string;
  dataAiHint: string;
  fileName: string; // For sorting
}

export function PromotionalGallery() {
  const [mediaItems, setMediaItems] = useState<PromotionalMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMedia = async () => {
      if (!storage) {
        console.warn("Firebase Storage is not initialized, cannot fetch promotional media.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const listRef = ref(storage, 'promotional-gallery');
        const res = await listAll(listRef);
        
        console.log(`Promotional Gallery: Found ${res.items.length} items. If 0, upload files to 'promotional-gallery' folder in Storage.`);

        if (res.items.length === 0) {
            setMediaItems([]);
            setIsLoading(false);
            return;
        }

        const fetchedMediaPromises = res.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          const name = itemRef.name.toLowerCase();
          const type = name.includes('video') ? 'video' : 'image';
          
          const cleanName = name.split('.')[0].replace(/^[0-9]+_/, '').replace(/_/g, ' ');
          
          return {
            type,
            url,
            title: cleanName.charAt(0).toUpperCase() + cleanName.slice(1) || (type === 'video' ? 'Vidéo Promotionnelle' : 'Image Promotionnelle'),
            dataAiHint: cleanName || 'promotional',
            fileName: itemRef.name,
          };
        });

        const unsortedMedia = await Promise.all(fetchedMediaPromises);
        const sortedMedia = unsortedMedia.sort((a, b) => a.fileName.localeCompare(b.fileName));
        
        setMediaItems(sortedMedia);

      } catch (error) {
        console.error("Error fetching promotional gallery from Storage:", error);
        setMediaItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMedia();
  }, []);

  if (isLoading) {
    return (
      <section className="py-4 md:py-8 space-y-6">
        <Skeleton className="h-[50vh] max-h-[500px] w-full rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="aspect-square w-full rounded-lg hidden md:block" />
          <Skeleton className="aspect-square w-full rounded-lg hidden md:block" />
        </div>
      </section>
    );
  }
  
  if (mediaItems.length === 0) {
      return (
        <section className="py-4 md:py-8">
            <div className="relative h-[50vh] max-h-[500px] w-full bg-muted/50 rounded-xl flex flex-col items-center justify-center text-center p-4">
                <h2 className="text-2xl font-bold font-headline text-primary">Contenu promotionnel à venir</h2>
                <p className="text-muted-foreground mt-2">De nouvelles offres et collections seront bientôt disponibles ici.</p>
            </div>
        </section>
      );
  }

  const heroMedia = mediaItems[0];
  const secondaryImages = mediaItems.slice(1);

  return (
    <section className="py-4 md:py-8 space-y-6">
      <div className="relative h-[50vh] max-h-[500px] w-full rounded-xl overflow-hidden shadow-2xl flex items-center justify-center">
        {heroMedia.type === 'video' ? (
          <video
            key={heroMedia.url}
            src={heroMedia.url}
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover z-0"
          />
        ) : (
          <Image
            src={heroMedia.url}
            alt={heroMedia.title}
            fill
            className="object-cover z-0"
            data-ai-hint={heroMedia.dataAiHint}
            priority
          />
        )}
        <div className="absolute inset-0 bg-black/40 z-10" />
        <div className="relative z-20 text-center text-white p-8">
          <h2 className="text-3xl md:text-5xl font-bold font-headline drop-shadow-lg">
            Donnez une Seconde Vie à Vos Objets
          </h2>
          <p className="mt-4 max-w-lg mx-auto text-lg text-white/90 drop-shadow-md">
            Découvrez des trésors uniques ou vendez ce que vous n'utilisez plus. Simple, rapide et local.
          </p>
          <Button asChild size="lg" className="mt-6 font-bold text-lg">
            <Link href="/browse">Explorer les Articles</Link>
          </Button>
        </div>
      </div>

      {secondaryImages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {secondaryImages.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden group shadow-lg"
            >
              <Image
                src={image.url}
                alt={image.title}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                data-ai-hint={image.dataAiHint}
              />
               <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                  <p className="text-white text-xs font-semibold drop-shadow-md truncate">{image.title}</p>
                </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
