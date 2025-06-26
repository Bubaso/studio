'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { Item } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';

interface MapItemPreviewCardProps {
  item: Item;
}

export function MapItemPreviewCard({ item }: MapItemPreviewCardProps) {
  const primaryImageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : 'https://placehold.co/200x150.png';
  const imageHint = item.dataAiHint || `${item.category} ${item.name.split(' ')[0]}`.toLowerCase();

  return (
    <div className="w-56 font-sans">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg">
        <Image
          src={primaryImageUrl}
          alt={item.name}
          fill
          sizes="224px"
          className="object-cover"
          data-ai-hint={imageHint}
        />
      </div>
      <div className="p-2 space-y-1">
        <h3 className="text-sm font-semibold truncate" title={item.name}>{item.name}</h3>
        <p className="text-md font-bold text-primary">{item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        <Link href={`/items/${item.id}`} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="sm" className="w-full mt-1">
                Voir les détails <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
        </Link>
      </div>
    </div>
  );
}
