
"use client";

import React, { useState } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { StatusFeedItem } from '@/lib/types';
import { StatusViewer } from './status-viewer';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';

interface StatusStoriesProps {
    items: StatusFeedItem[];
}

export function StatusStories({ items }: StatusStoriesProps) {
    const t = useTranslations('StatusFeed');
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
            <h2 className="text-xl sm:text-2xl font-bold font-headline text-primary mb-3 md:mb-4 px-1 flex items-center gap-2">
                 <Users className="h-6 w-6" />
                {t('title')}
            </h2>
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex space-x-4 p-2">
                {items.map((feedItem, index) => (
                    <div key={feedItem.user.uid} className="flex flex-col items-center gap-1.5 w-20">
                    <Button
                        variant="ghost"
                        className="p-0 w-16 h-16 rounded-full relative"
                        onClick={() => openViewer(index)}
                    >
                        <Avatar className="w-full h-full border-2 border-transparent ring-2 ring-primary ring-offset-2 ring-offset-background">
                            <AvatarImage src={feedItem.user.avatarUrl || undefined} alt={feedItem.user.name || 'Avatar'} />
                            <AvatarFallback>{(feedItem.user.name || 'U').substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </Button>
                    <p className="text-xs font-medium truncate w-full text-center text-muted-foreground">{feedItem.user.name}</p>
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
