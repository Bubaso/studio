'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';
import { storage } from '@/lib/firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';


interface PromotionalMedia {
  type: 'video' | 'image';
  url: string;
  title: string;
  dataAiHint: string;
}

export function PromotionalGallery() {
  const [mediaItems, setMediaItems] = useState<PromotionalMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMainVideoPlaying, setIsMainVideoPlaying] = useState(false);


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
        
        console.log(`Promotional Gallery: Found ${res.items.length} items in Storage. If this is 0, please upload files to the 'promotional-gallery' folder.`);

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
            title: cleanName.charAt(0).toUpperCase() + cleanName.slice(1) || (type === 'video' ? 'Promotional Video' : 'Promotional Image'),
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

  const openDialog = (index: number) => {
    setSelectedIndex(index);
    setIsDialogOpen(true);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex(
      (prevIndex) => (prevIndex + 1) % mediaItems.length
    );
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex(
      (prevIndex) =>
        (prevIndex - 1 + mediaItems.length) % mediaItems.length
    );
  };
  
  const handleMainVideoClick = () => {
    const video = videoRef.current;
    if (video) {
        if (video.paused) {
            video.play();
            video.muted = false;
        } else {
            video.pause();
        }
    }
  };


  if (isLoading || mediaItems.length === 0) {
    return (
        <section className="py-4 md:py-8">
            <div className="grid grid-cols-3 gap-2 md:gap-4 h-[200px] sm:h-[250px] md:h-[290px]">
                <Skeleton className="col-span-2 h-full w-full bg-muted/50" />
                <div className="flex flex-col gap-2 md:gap-4">
                    <Skeleton className="h-full w-full bg-muted/50" />
                    <Skeleton className="h-full w-full bg-muted/50" />
                    <Skeleton className="h-full w-full bg-muted/50" />
                </div>
            </div>
        </section>
    );
  }

  const mainMedia = mediaItems[0];
  const sideImages = mediaItems.slice(1, 4);

  return (
    <section className="py-4 md:py-8">
      <div className="grid grid-cols-3 gap-2 md:gap-4 h-[200px] sm:h-[250px] md:h-[290px] group">
        
        {mainMedia && (
            <div
                className="col-span-2 relative rounded-lg overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-300"
                onClick={mainMedia.type === 'video' ? handleMainVideoClick : () => openDialog(0)}
            >
                 {mainMedia.type === 'video' ? (
                    <video
                        ref={videoRef}
                        onPlay={() => setIsMainVideoPlaying(true)}
                        onPause={() => setIsMainVideoPlaying(false)}
                        key={mainMedia.url}
                        src={mainMedia.url}
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <Image
                        src={mainMedia.url}
                        alt={mainMedia.title}
                        fill
                        sizes="(max-width: 767px) 66vw, 66vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        data-ai-hint={mainMedia.dataAiHint}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent"></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {mainMedia.type === 'video' && !isMainVideoPlaying && <PlayCircle className="h-12 w-12 md:h-16 md:w-16 text-white/80 group-hover:text-white group-hover:scale-110 transition-all duration-300 drop-shadow-lg" />}
                </div>
                <div className="absolute bottom-0 left-0 p-2 md:p-4 pointer-events-none">
                    <h3 className="text-white font-bold font-headline text-base md:text-xl drop-shadow-md">
                    {mainMedia.title}
                    </h3>
                </div>
            </div>
        )}

        <div className="flex flex-col gap-2 md:gap-4">
          {sideImages.map((image, index) => (
            image &&
            <div
              key={index}
              className="relative rounded-lg overflow-hidden cursor-pointer flex-1 shadow-lg hover:shadow-2xl transition-shadow duration-300"
              onClick={() => openDialog(index + 1)}
            >
              <Image
                src={image.url}
                alt={image.title}
                fill
                sizes="33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                data-ai-hint={image.dataAiHint}
              />
               <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors"></div>
               <div className="absolute bottom-0 left-0 p-1 md:p-2">
                 <h4 className="text-white font-semibold text-[10px] md:text-sm drop-shadow-sm">
                    {image.title}
                 </h4>
               </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] p-0 bg-background/80 backdrop-blur-sm flex items-center justify-center border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Galerie</DialogTitle>
          </DialogHeader>

          <div className="relative w-full h-full p-8">
            {mediaItems[selectedIndex]?.type === 'video' ? (
              <video
                src={mediaItems[selectedIndex].url}
                controls
                autoPlay
                className="w-full h-full object-contain rounded-md"
              />
            ) : mediaItems[selectedIndex]?.url ? (
              <Image
                src={mediaItems[selectedIndex].url}
                alt={mediaItems[selectedIndex].title}
                fill
                className="object-contain rounded-md"
              />
            ) : null}
          </div>

          {mediaItems.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-black/30 hover:bg-black/60 text-white hover:text-white transition-all"
                onClick={handlePrev}
                aria-label="Önceki"
              >
                <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-black/30 hover:bg-black/60 text-white hover:text-white transition-all"
                onClick={handleNext}
                aria-label="Sonraki"
              >
                <ChevronRight className="h-8 w-8 sm:h-10 sm:w-10" />
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
