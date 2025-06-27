'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlayCircle } from 'lucide-react';

// --- Placeholder Data ---
// In a real application, this data would likely come from a CMS or Firestore.
const PROMOTIONAL_MEDIA = [
  {
    type: 'video',
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnailUrl: 'https://placehold.co/1280x720.png',
    title: 'Comment fonctionne ReFind ?',
    dataAiHint: 'tutorial explainer',
  },
  {
    type: 'image',
    url: 'https://placehold.co/1280x720.png',
    title: 'Vendez vos articles facilement',
    dataAiHint: 'selling online',
  },
  {
    type: 'image',
    url: 'https://placehold.co/1280x720.png',
    title: 'Trouvez des trésors uniques',
    dataAiHint: 'unique find',
  },
  {
    type: 'image',
    url: 'https://placehold.co/1280x720.png',
    title: 'Rejoignez notre communauté',
    dataAiHint: 'community people',
  },
];
// ------------------------

export function PromotionalGallery() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const openDialog = (index: number) => {
    setSelectedIndex(index);
    setIsDialogOpen(true);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex(
      (prevIndex) => (prevIndex + 1) % PROMOTIONAL_MEDIA.length
    );
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex(
      (prevIndex) =>
        (prevIndex - 1 + PROMOTIONAL_MEDIA.length) % PROMOTIONAL_MEDIA.length
    );
  };

  const mainVideo = PROMOTIONAL_MEDIA[0];
  const sideImages = PROMOTIONAL_MEDIA.slice(1, 4);

  return (
    <section className="py-4 md:py-8">
      <div className="grid grid-cols-3 gap-2 md:gap-4 h-[200px] sm:h-[250px] md:h-[290px] group">
        
        {/* Main Video Section (Left) */}
        <div
          className="col-span-2 relative rounded-lg overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-shadow duration-300"
          onClick={() => openDialog(0)}
        >
          <Image
            src={mainVideo.thumbnailUrl}
            alt={mainVideo.title}
            fill
            sizes="(max-width: 767px) 66vw, 66vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            data-ai-hint={mainVideo.dataAiHint}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <PlayCircle className="h-12 w-12 md:h-16 md:w-16 text-white/80 group-hover:text-white group-hover:scale-110 transition-all duration-300 drop-shadow-lg" />
          </div>
          <div className="absolute bottom-0 left-0 p-2 md:p-6">
            <h3 className="text-white font-bold font-headline text-base md:text-2xl drop-shadow-md">
              {mainVideo.title}
            </h3>
          </div>
        </div>

        {/* Side Images Section (Right) */}
        <div className="flex flex-col gap-2 md:gap-4">
          {sideImages.map((image, index) => (
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

      {/* Gallery Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] p-0 bg-background/80 backdrop-blur-sm flex items-center justify-center border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Galerie</DialogTitle>
          </DialogHeader>

          <div className="relative w-full h-full p-8">
            {PROMOTIONAL_MEDIA[selectedIndex]?.type === 'video' ? (
              <video
                src={PROMOTIONAL_MEDIA[selectedIndex].url}
                controls
                autoPlay
                className="w-full h-full object-contain rounded-md"
              />
            ) : PROMOTIONAL_MEDIA[selectedIndex]?.url ? (
              <Image
                src={PROMOTIONAL_MEDIA[selectedIndex].url}
                alt={PROMOTIONAL_MEDIA[selectedIndex].title}
                fill
                className="object-contain rounded-md"
              />
            ) : null}
          </div>

          {PROMOTIONAL_MEDIA.length > 1 && (
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
