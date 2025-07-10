
"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { storage } from '@/lib/firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

const PROMO_SESSION_KEY = 'sellPagePromoShown';

export function PromotionalModal() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [imageMap, setImageMap] = useState<Map<string, string>>(new Map());
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPromoImage = async () => {
      if (!storage) {
        console.warn("Firebase Storage is not initialized.");
        setIsLoading(false);
        return;
      }
      try {
        const galleryRef = ref(storage, 'motion-gallery');
        const res = await listAll(galleryRef);
        if (res.items.length > 0) {
          const newImageMap = new Map<string, string>();
          for (const itemRef of res.items) {
            const url = await getDownloadURL(itemRef);
            newImageMap.set(itemRef.name.toLowerCase(), url);
          }
          setImageMap(newImageMap);
        }
      } catch (error) {
        console.error("Error fetching promotional image from motion-gallery:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromoImage();
  }, []);

  useEffect(() => {
    if (isLoading || typeof window === 'undefined') {
      return;
    }

    const hasBeenShown = sessionStorage.getItem(PROMO_SESSION_KEY);
    if (hasBeenShown) {
      return;
    }
    
    let targetImage: string | undefined;
    if (pathname.includes('/sell')) {
        targetImage = imageMap.get('sell.jpg');
    } else if (pathname.includes('/browse')) {
        targetImage = imageMap.get('browse.jpg');
    }

    if (targetImage) {
        setActiveImageUrl(targetImage);
        const timer = setTimeout(() => {
            setIsOpen(true);
            sessionStorage.setItem(PROMO_SESSION_KEY, 'true');
        }, 500);
        return () => clearTimeout(timer);
    } else {
        // If the target image for the current page isn't found, close any potentially open dialog.
        setIsOpen(false);
        setActiveImageUrl(null);
    }
    
  }, [pathname, imageMap, isLoading]);

  if (!activeImageUrl || !isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-0 bg-transparent border-none w-full max-w-lg shadow-none">
        <div className="relative aspect-[3/4] w-full bg-muted rounded-lg flex items-center justify-center">
           <Image
            src={activeImageUrl}
            alt="Promotional Offer"
            fill
            className="object-cover rounded-lg"
            data-ai-hint="promotional advertisement"
          />
           <DialogClose asChild>
             <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
                aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
