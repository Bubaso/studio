
"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { storage } from '@/lib/firebase';
import { ref, listAll, getDownloadURL } from 'firebase/storage';

const getPromoSessionKey = (page: string) => `promoShown_${page}`;

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

    let targetImage: string | undefined;
    let pageKey: string | null = null;

    if (pathname.includes('/sell')) {
      pageKey = 'sell';
      targetImage = imageMap.get('sell.jpg');
    } else if (pathname.includes('/browse')) {
      pageKey = 'browse';
      targetImage = imageMap.get('browse.jpg');
    }
    
    if (pageKey) {
        const sessionKey = getPromoSessionKey(pageKey);
        const hasBeenShown = sessionStorage.getItem(sessionKey);
        
        if (!hasBeenShown && targetImage) {
            setActiveImageUrl(targetImage);
            const timer = setTimeout(() => {
                setIsOpen(true);
                sessionStorage.setItem(sessionKey, 'true');
            }, 500);
            return () => clearTimeout(timer);
        }
    }
    
    // Close modal if navigating away or no target image
    setIsOpen(false);
    
  }, [pathname, imageMap, isLoading]);

  if (!activeImageUrl || !isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-0 bg-transparent border-none w-full max-w-lg shadow-none">
        <DialogHeader className="sr-only">
            <DialogTitle>Promotional Offer</DialogTitle>
        </DialogHeader>
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
