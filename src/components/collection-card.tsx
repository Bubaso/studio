
"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Folder } from 'lucide-react';
import type { UserCollection } from '@/lib/types';
import { useTranslations } from 'next-intl';

interface CollectionCardProps {
  collection: UserCollection;
}

const genericBlurDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export function CollectionCard({ collection }: CollectionCardProps) {
  const t = useTranslations('FavoritesPage.collectionCard');
  const primaryImageUrl = collection.previewImageUrls?.[0];

  return (
    <Link href={`/favorites/${collection.id}`} className="block group">
      <Card className="relative aspect-video w-full overflow-hidden rounded-lg shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]">
        {primaryImageUrl ? (
            <Image
                src={primaryImageUrl}
                alt={`Preview for ${collection.name} collection`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                placeholder="blur"
                blurDataURL={genericBlurDataURL}
                data-ai-hint="collection item"
            />
        ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
                <Folder className="h-16 w-16 text-muted-foreground/30" />
            </div>
        )}

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

        {/* Text Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="font-headline text-lg font-bold drop-shadow-md group-hover:text-primary-foreground transition-colors">
            {collection.name}
          </h3>
          <p className="text-sm text-white/80 drop-shadow-sm">
            {t('itemCount', { count: collection.itemCount })}
          </p>
        </div>
      </Card>
    </Link>
  );
}
