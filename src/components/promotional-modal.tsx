
"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { X } from 'lucide-react';
import { Button } from './ui/button';

const PROMO_SESSION_KEY = 'sellPagePromoShown';

export function PromotionalModal() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // We only want this logic to run on the client side
    if (typeof window === 'undefined') {
      return;
    }

    const hasBeenShown = sessionStorage.getItem(PROMO_SESSION_KEY);

    // Check if the current path is the sell page and the promo hasn't been shown yet
    if (pathname.includes('/sell') && !hasBeenShown) {
      // Open the modal after a short delay to ensure the page is visible
      const timer = setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem(PROMO_SESSION_KEY, 'true');
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="p-0 bg-transparent border-none w-full max-w-lg shadow-none">
        <div className="relative aspect-[3/4] w-full">
           <Image
            src="https://placehold.co/600x800.png"
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
