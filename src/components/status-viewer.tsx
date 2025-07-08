
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { StatusFeedItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StatusViewerProps {
  items: StatusFeedItem[];
  startIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORY_DURATION_MS = 7000;

export function StatusViewer({ items, startIndex, open, onOpenChange }: StatusViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isPaused, setIsPaused] = useState(false);

  // Memoize navigation functions
  const goToNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onOpenChange(false); // Close at the end
    }
  }, [currentIndex, items.length, onOpenChange]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  // Reset index when viewer is opened
  useEffect(() => {
    if (open) {
      setCurrentIndex(startIndex);
    }
  }, [startIndex, open]);

  // Handle auto-advance timer
  useEffect(() => {
    if (open && !isPaused) {
      const timer = setTimeout(goToNext, STORY_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, open, isPaused, goToNext]);
  
  if (!open) return null;
  const currentItem = items[currentIndex];
  if (!currentItem) return null;

  const mainImage = currentItem.item?.imageUrls[0];
  const itemLink = currentItem.item ? `/items/${currentItem.item.id}` : '#';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        onPointerDown={() => setIsPaused(true)}
        onPointerUp={() => setIsPaused(false)}
        className="p-0 bg-black/95 border-none w-screen h-screen max-w-full max-h-full sm:h-[95vh] sm:w-auto sm:max-w-md sm:aspect-[9/16] sm:rounded-2xl flex flex-col gap-0 overflow-hidden"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Statut de {currentItem.user.name}</DialogTitle>
        </DialogHeader>
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex flex-col gap-2">
            {/* Progress Bars */}
            <div className="flex items-center gap-1.5">
                {items.map((_, index) => (
                    <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full bg-white", index === currentIndex && !isPaused && 'animate-story-progress')}
                            style={{ animationDuration: `${STORY_DURATION_MS}ms`}}
                        />
                    </div>
                ))}
            </div>
            {/* User Info */}
            <div className="flex items-center gap-3 text-white">
                <Link href={`/profile/${currentItem.user.uid}`} onClick={() => onOpenChange(false)}>
                    <Avatar className="h-9 w-9 border-2 border-white/50">
                        <AvatarImage src={currentItem.user.avatarUrl || undefined} />
                        <AvatarFallback>{(currentItem.user.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex flex-col">
                    <Link href={`/profile/${currentItem.user.uid}`} onClick={() => onOpenChange(false)} className="font-semibold hover:underline text-sm">{currentItem.user.name}</Link>
                    <span className="text-xs text-white/70">{formatDistanceToNow(new Date(currentItem.status.updatedAt), { addSuffix: true, locale: fr })}</span>
                </div>
            </div>
        </div>

        {/* Background Image */}
        {mainImage && (
            <Image src={mainImage} alt={currentItem.item?.name || "Status Image"} fill className="object-cover z-0" data-ai-hint="product photo"/>
        )}
         <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/50 z-10" />
        
        {/* Main Content */}
        <div className="relative z-20 flex-1 flex flex-col justify-end p-6 text-white text-center">
            <p className="text-lg font-medium drop-shadow-lg">{currentItem.status.text}</p>
        </div>

        {/* Footer Link */}
        {currentItem.item && (
             <div className="relative z-20 p-4 border-t border-white/20">
                <Link href={itemLink} onClick={() => onOpenChange(false)} className="block text-center text-white font-semibold text-sm hover:underline">
                    Voir l'article
                </Link>
            </div>
        )}

        {/* Navigation Overlays */}
        <div className="absolute inset-0 flex justify-between items-center z-30">
            <button onClick={goToPrev} className="h-full w-1/3" aria-label="Previous Story" />
            <button onClick={goToNext} className="h-full w-1/3" aria-label="Next Story" />
        </div>
        
        {/* Close Button */}
        <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 right-3 z-30 text-white hover:bg-white/20 hover:text-white rounded-full"
            onClick={() => onOpenChange(false)}
        >
            <X />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
