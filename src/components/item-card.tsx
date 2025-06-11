
import Link from 'next/link';
import Image from 'next/image';
import type { Item } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FavoriteButtonClient } from './favorite-button-client';

interface ItemCardProps {
  item: Item;
}

// Generic tiny transparent PNG for blurDataURL
const genericBlurDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export function ItemCard({ item }: ItemCardProps) {
  const primaryImageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : 'https://placehold.co/600x400.png';
  const imageHint = item.dataAiHint || `${item.category} ${item.name.split(' ')[0]}`.toLowerCase();

  return (
    <Card className="group/itemcard flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-[1.015] active:scale-[0.98]">
      <Link href={`/items/${item.id}`} className="flex flex-col h-full group">
        <CardHeader className="p-0 relative">
          <div className="aspect-[4/3] relative w-full overflow-hidden">
            <Image
              src={primaryImageUrl}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              data-ai-hint={imageHint}
              loading="lazy"
              placeholder="blur"
              blurDataURL={genericBlurDataURL}
            />
          </div>
          <div className="absolute top-2 right-2 z-10 opacity-80 group-hover/itemcard:opacity-100 transition-opacity">
            <FavoriteButtonClient itemId={item.id} className="bg-background/70 hover:bg-background/90" />
          </div>
        </CardHeader>
        <CardContent className="p-3 flex-grow flex flex-col"> {/* Reduced padding, ensure content grows */}
          <div className="flex-grow">
            <CardTitle className="text-md font-semibold mb-1 hover:text-primary transition-colors line-clamp-2" title={item.name}>{item.name}</CardTitle>
            <p className="text-lg font-bold text-primary mb-1.5">{item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            <div className="flex items-center text-xs text-muted-foreground mb-0.5">
              <Package className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
              <span className="truncate" title={item.category}>{item.category}</span>
            </div>
            {item.location && (
              <div className="flex items-center text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                <span className="truncate" title={item.location}>{item.location}</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="p-3 pt-2"> {/* Reduced padding */}
          <div className="w-full"> {/* Wrapped Badge in div to ensure CardFooter styling applies correctly if Badge doesn't fill width */}
            <Badge variant="secondary" className="w-full justify-center py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors">
              Voir les détails
            </Badge>
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}
