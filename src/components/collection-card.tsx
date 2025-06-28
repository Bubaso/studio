
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, ImageIcon } from 'lucide-react';
import type { UserCollection } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CollectionCardProps {
  collection: UserCollection;
}

const genericBlurDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export function CollectionCard({ collection }: CollectionCardProps) {
  const previews = collection.previewImageUrls || [];

  return (
    <Link href={`/favorites/${collection.id}`} className="block group">
      <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-[1.015] active:scale-[0.98]">
        <CardHeader className="p-0 relative">
          <div className="aspect-video w-full bg-muted overflow-hidden">
            {previews.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <Folder className="h-12 w-12 text-muted-foreground/50" />
              </div>
            ) : (
              <div className={cn(
                "grid h-full w-full gap-0.5",
                previews.length === 1 && "grid-cols-1",
                previews.length === 2 && "grid-cols-2",
                previews.length === 3 && "grid-cols-2",
                previews.length >= 4 && "grid-cols-2 grid-rows-2",
              )}>
                {previews.slice(0, 4).map((url, index) => (
                  <div key={index} className={cn(
                    "relative overflow-hidden",
                    previews.length === 3 && index === 0 && "row-span-2"
                  )}>
                    <Image
                      src={url}
                      alt={`Aperçu de la collection ${collection.name}`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      placeholder="blur"
                      blurDataURL={genericBlurDataURL}
                      data-ai-hint="collection item"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
          <CardTitle className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors line-clamp-2" title={collection.name}>
            {collection.name}
          </CardTitle>
          <CardDescription>
            {collection.itemCount} article{collection.itemCount !== 1 ? 's' : ''}
          </CardDescription>
        </CardContent>
        <CardFooter className="p-3 pt-0 text-xs text-muted-foreground">
           Créé le {new Date(collection.createdAt).toLocaleDateString('fr-FR')}
        </CardFooter>
      </Card>
    </Link>
  );
}
