"use client";

import React, { useState } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { UserStory } from '@/lib/types';
import { StatusViewer } from './status-viewer';

interface StatusStoriesProps {
    items: UserStory[];
}

export function StatusStories({ items }: StatusStoriesProps) {
    const [viewerOpen, setViewerOpen] = useState(false);
    const [startIndex, setStartIndex] = useState(0);

    const openViewer = (index: number) => {
        setStartIndex(index);
        setViewerOpen(true);
    };

    if (!items || items.length === 0) {
        return null;
    }

    return (
        <section className="py-4 md:py-6">
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex space-x-4 p-2">
                {items.map((storyGroup, index) => (
                    <div key={storyGroup.user.uid} className="flex flex-col items-center gap-1.5 w-20">
                    <Button
                        variant="ghost"
                        className="p-0 w-16 h-16 rounded-full relative"
                        onClick={() => openViewer(index)}
                    >
                        <Avatar className="w-full h-full border-2 border-transparent ring-2 ring-primary ring-offset-2 ring-offset-background">
                            <AvatarImage src={storyGroup.user.avatarUrl || undefined} alt={storyGroup.user.name || 'Avatar'} />
                            <AvatarFallback>{(storyGroup.user.name || 'U').substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </Button>
                    <p className="text-xs font-medium truncate w-full text-center text-muted-foreground">{storyGroup.user.name}</p>
                    </div>
                ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
            
            {viewerOpen && (
                <StatusViewer
                    items={items}
                    startIndex={startIndex}
                    open={viewerOpen}
                    onOpenChange={setViewerOpen}
                />
            )}
        </section>
    );
}
