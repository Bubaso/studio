
import Link from 'next/link';
import Image from 'next/image';
import type { Item } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MapPin, Flag, TrendingDown, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FavoriteButtonClient } from './favorite-button-client';
import { cn } from '@/lib/utils';

interface ItemCardProps {
  item: Item;
}

// Generic tiny transparent PNG for blurDataURL
const genericBlurDataURL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export function ItemCard({ item }: ItemCardProps) {
  const primaryImageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : 'https://placehold.co/600x400.png';
  const imageHint = item.dataAiHint || `${item.category} ${item.name.split(' ')[0]}`.toLowerCase();

  return (
    <Card className={cn(
        "group/itemcard flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-[1.015] active:scale-[0.98]",
        item.lowActivity && "opacity-85 hover:opacity-100",
        item.isSold && "opacity-70 grayscale-[50%] hover:opacity-80"
    )}>
      <Link href={`/items/${item.id}`} className="flex flex-col h-full group">
        <CardHeader className="p-0 relative">
          <div className="aspect-[4/3] relative w-full overflow-hidden">
            <Image
              src={primaryImageUrl}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                  "object-cover transition-transform duration-300 group-hover:scale-105",
                  item.lowActivity && "grayscale-[25%]",
                  item.isSold && "grayscale-[75%]"
              )}
              data-ai-hint={imageHint}
              loading="lazy"
              placeholder="blur"
              blurDataURL={genericBlurDataURL}
            />
            {item.isSold ? (
                 <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-2">
                    <Badge variant="destructive" className="text-xs py-1 px-3 transform-gpu scale-90 text-center">
                        <CheckCircle className="h-3 w-3 mr-1.5" />
                        VENDU
                    </Badge>
                </div>
            ) : item.suspectedSold ? (
                <div className="absolute inset-0 bg-gray-900/40 flex items-center justify-center p-2">
                    <Badge variant="destructive" className="text-xs py-1 px-3 transform-gpu scale-90 text-center">
                        <Flag className="h-3 w-3 mr-1.5" />
                        Non confirmé : peut être vendu
                    </Badge>
                </div>
            ) : item.lowActivity && (
                 <div className="absolute inset-0 bg-gray-900/10 flex items-center justify-center p-2 pointer-events-none">
                    <Badge variant="outline" className="bg-background/90 text-xs py-1 px-3 text-center text-muted-foreground shadow-sm">
                        <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
                        Peu d’activité récente
                    </Badge>
                </div>
            )}
          </div>
          <div className="absolute top-2 right-2 z-10 opacity-80 group-hover/itemcard:opacity-100 transition-opacity">
            <FavoriteButtonClient itemId={item.id} className="bg-background/70 hover:bg-background/90" />
          </div>
        </CardHeader>
        <CardContent className="p-3 flex-grow flex flex-col">
          <div className="flex-grow">
            <CardTitle className="text-md font-semibold mb-1 hover:text-primary transition-colors line-clamp-2" title={item.name}>{item.name}</CardTitle>
            <p className={cn("text-lg font-bold text-primary mb-1.5", item.isSold && "text-muted-foreground line-through")}>{item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
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
        <CardFooter className="p-3 pt-2">
          <div className="w-full">
            <Badge variant={item.isSold ? "outline" : "secondary"} className="w-full justify-center py-1.5 text-xs hover:bg-accent hover:text-accent-foreground transition-colors">
              {item.isSold ? 'Voir l\'annonce vendue' : 'Voir les détails'}
            </Badge>
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}
