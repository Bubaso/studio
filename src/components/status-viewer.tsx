
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { UserStory } from '@/lib/types';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface StatusViewerProps {
  items: UserStory[];
  startIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORY_DURATION_MS = 7000;

export function StatusViewer({ items, startIndex, open, onOpenChange }: StatusViewerProps) {
  const [currentUserIndex, setCurrentUserIndex] = useState(startIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const goToNext = useCallback(() => {
    const currentUserStoryGroup = items[currentUserIndex];
    if (!currentUserStoryGroup) {
      onOpenChange(false);
      return;
    }

    if (currentStoryIndex < currentUserStoryGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else if (currentUserIndex < items.length - 1) {
      setCurrentUserIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      onOpenChange(false);
    }
  }, [currentUserIndex, currentStoryIndex, items, onOpenChange]);

  const goToPrev = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (currentUserIndex > 0) {
      const prevUserStories = items[currentUserIndex - 1].stories;
      setCurrentUserIndex(prev => prev - 1);
      setCurrentStoryIndex(prevUserStories.length - 1);
    }
  }, [currentUserIndex, currentStoryIndex, items]);


  // Reset indices when viewer is opened or start index changes
  useEffect(() => {
    if (open) {
      setCurrentUserIndex(startIndex);
      setCurrentStoryIndex(0);
      setIsPaused(false);
    }
  }, [startIndex, open]);
  
  // Handle auto-advance timer
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (open && !isPaused) {
      timerRef.current = setTimeout(goToNext, STORY_DURATION_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentUserIndex, currentStoryIndex, open, isPaused, goToNext]);


  if (!open || !items[currentUserIndex]) return null;
  const currentUserStoryGroup = items[currentUserIndex];
  const currentStory = currentUserStoryGroup.stories[currentStoryIndex];
  if (!currentStory) {
      onOpenChange(false); // Close if there's no story, e.g., data issue
      return null;
  }

  const mainImage = currentStory.itemPreview?.imageUrl;
  const itemLink = currentStory.itemPreview ? `/items/${currentStory.itemPreview.id}` : '#';

  const handlePointerDown = () => setIsPaused(true);
  const handlePointerUp = () => setIsPaused(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        className="p-0 bg-black/95 border-none w-screen h-screen max-w-full max-h-full sm:h-[95vh] sm:w-auto sm:max-w-md sm:aspect-[9/16] sm:rounded-2xl flex flex-col gap-0 overflow-hidden"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Statut de {currentUserStoryGroup.user.name}</DialogTitle>
        </DialogHeader>
        <div className="absolute top-0 left-0 right-0 p-4 z-20 flex flex-col gap-2">
            {/* Progress Bars */}
            <div className="flex items-center gap-1.5">
                {currentUserStoryGroup.stories.map((_, index) => (
                    <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full bg-white",
                                index < currentStoryIndex ? "w-full" : "w-0",
                                index === currentStoryIndex && !isPaused ? "animate-story-progress" : ""
                            )}
                            style={{ animationDuration: `${STORY_DURATION_MS}ms`}}
                        />
                    </div>
                ))}
            </div>
            {/* User Info */}
            <div className="flex items-center gap-3 text-white">
                <Link href={`/profile/${currentUserStoryGroup.user.uid}`} onClick={() => onOpenChange(false)}>
                    <Avatar className="h-9 w-9 border-2 border-white/50">
                        <AvatarImage src={currentUserStoryGroup.user.avatarUrl || undefined} />
                        <AvatarFallback>{(currentUserStoryGroup.user.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex flex-col">
                    <Link href={`/profile/${currentUserStoryGroup.user.uid}`} onClick={() => onOpenChange(false)} className="font-semibold hover:underline text-sm">{currentUserStoryGroup.user.name}</Link>
                    <span className="text-xs text-white/70">{formatDistanceToNow(new Date(currentStory.updatedAt), { addSuffix: true, locale: fr })}</span>
                </div>
            </div>
        </div>

        {/* Background Image */}
        {mainImage && (
            <Image src={mainImage} alt={currentStory.itemPreview?.name || "Status Image"} fill className="object-cover z-0" data-ai-hint="product photo"/>
        )}
         <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/50 z-10" />
        
        {/* Main Content */}
        <div className="relative z-20 flex-1 flex flex-col justify-end p-6 text-white text-center">
            <p className="text-lg font-medium drop-shadow-lg">{currentStory.text}</p>
        </div>

        {/* Footer Link */}
        {currentStory.itemPreview && (
             <div className="relative z-20 p-4 border-t border-white/20">
                <Link href={itemLink} onClick={() => onOpenChange(false)} className="block text-center text-white font-semibold text-sm hover:underline">
                    Voir l'article: {currentStory.itemPreview.name}
                </Link>
            </div>
        )}

        {/* Navigation Overlays */}
        <div className="absolute inset-y-0 left-0 flex justify-between items-center z-30 w-1/3">
            <button onClick={goToPrev} className="h-full w-full" aria-label="Previous Story" />
        </div>
        <div className="absolute inset-y-0 right-0 flex justify-between items-center z-30 w-1/3">
            <button onClick={goToNext} className="h-full w-full" aria-label="Next Story" />
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
