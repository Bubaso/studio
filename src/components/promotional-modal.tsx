
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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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
          // Fetch the URL of the first image in the folder
          const firstItemRef = res.items[0];
          const url = await getDownloadURL(firstItemRef);
          setImageUrl(url);
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
    // This logic runs after the image URL has been fetched
    if (isLoading) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const hasBeenShown = sessionStorage.getItem(PROMO_SESSION_KEY);

    // Only show if we have an image, we are on the sell page, and it hasn't been shown
    if (imageUrl && pathname.includes('/sell') && !hasBeenShown) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem(PROMO_SESSION_KEY, 'true');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [pathname, imageUrl, isLoading]);

  // Don't render the dialog if there's no image to show
  if (!imageUrl) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-0 bg-transparent border-none w-full max-w-lg shadow-none">
        <div className="relative aspect-[3/4] w-full bg-muted rounded-lg flex items-center justify-center">
           <Image
            src={imageUrl}
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
