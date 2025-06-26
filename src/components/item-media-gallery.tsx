'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Maximize, Video, CheckCircle } from 'lucide-react';
import type { Item } from '@/lib/types';

interface ItemMediaGalleryProps {
  item: Item;
}

export function ItemMediaGallery({ item }: ItemMediaGalleryProps) {
  const hasVideo = !!item.videoUrl;
  const mediaItems = [...(item.imageUrls || []), ...(hasVideo ? [item.videoUrl] : [])];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const openDialog = (index: number) => {
    setSelectedIndex(index);
    setIsDialogOpen(true);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prevIndex) => (prevIndex + 1) % mediaItems.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prevIndex) => (prevIndex - 1 + mediaItems.length) % mediaItems.length);
  };

  const mainDisplayMediaUrl = item.imageUrls?.[0] || 'https://placehold.co/600x400.png';
  const imageHint = item.dataAiHint || `${item.category} ${item.name.split(' ')[0]}`.toLowerCase();
  const mainPreviewIndex = hasVideo ? mediaItems.length - 1 : 0;


  return (
    <div className="space-y-4">
      <Card className="shadow-lg rounded-lg overflow-hidden group">
        <div
          className="relative aspect-video bg-black cursor-pointer"
          onClick={() => openDialog(mainPreviewIndex)}
        >
            {hasVideo ? (
                <video
                    // By appending #t=0.1, we encourage browsers to show the first frame as a poster/thumbnail
                    src={`${item.videoUrl}#t=0.1`}
                    controls={false}
                    autoPlay={false}
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-contain"
                    preload="metadata"
                >
                    Votre navigateur ne supporte pas la lecture de vidéos.
                </video>
            ) : (
                <Image
                    src={mainDisplayMediaUrl}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                    data-ai-hint={imageHint}
                    priority
                />
            )}
            
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                {hasVideo ? <Video className="h-12 w-12 text-white" /> : <Maximize className="h-12 w-12 text-white" />}
            </div>

            {item.isSold && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4 pointer-events-none">
                    <Badge variant="destructive" className="text-base sm:text-lg py-2 px-4 border-2 border-white/50 transform-gpu scale-110">
                        <CheckCircle className="h-5 w-5 mr-2" /> VENDU
                    </Badge>
                </div>
            )}
        </div>
      </Card>
      
      {mediaItems.length > 1 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {mediaItems.map((mediaUrl, index) => {
            const isVideoThumbnail = hasVideo && index === mediaItems.length - 1;
            return (
              <div
                key={index}
                onClick={() => openDialog(index)}
                className="relative aspect-square rounded-md overflow-hidden border hover:opacity-80 transition-opacity cursor-pointer bg-black"
              >
                {isVideoThumbnail ? (
                  <>
                    <video
                        key={mediaUrl}
                        // Use the #t=0.1 trick to show the first frame as a thumbnail
                        src={`${mediaUrl}#t=0.1`}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
                        <Video className="h-8 w-8 text-white drop-shadow-lg" />
                    </div>
                  </>
                ) : (
                  <Image
                    src={mediaUrl}
                    alt={`${item.name} - image ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                    className="object-cover"
                    data-ai-hint={imageHint}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] p-1 bg-background/80 backdrop-blur-sm flex items-center justify-center border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Aperçu des médias pour {item.name}</DialogTitle>
          </DialogHeader>
          
          <div className="relative w-full h-full">
            {hasVideo && selectedIndex === mediaItems.length - 1 ? (
              <video src={mediaItems[selectedIndex]} controls autoPlay className="w-full h-full object-contain rounded-md" />
            ) : (
              mediaItems[selectedIndex] && <Image src={mediaItems[selectedIndex]} alt={`Image ${selectedIndex + 1} de ${item.name}`} fill className="object-contain rounded-md" />
            )}
          </div>
          
          {mediaItems.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-black/30 hover:bg-black/60 text-white hover:text-white transition-all"
                onClick={handlePrev}
                aria-label="Média précédent"
              >
                <ChevronLeft className="h-8 w-8 sm:h-10 sm:w-10" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-black/30 hover:bg-black/60 text-white hover:text-white transition-all"
                onClick={handleNext}
                aria-label="Média suivant"
              >
                <ChevronRight className="h-8 w-8 sm:h-10 sm:w-10" />
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
