
import Link from 'next/link';
import Image from 'next/image';
import type { Item } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FavoriteButtonClient } from './favorite-button-client'; // Import FavoriteButtonClient

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const primaryImageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : 'https://placehold.co/600x400.png';
  const imageHint = item.dataAiHint || `${item.category} ${item.name.split(' ')[0]}`.toLowerCase();

  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg group/itemcard">
      <Link href={`/items/${item.id}`} className="block group">
        <CardHeader className="p-0 relative"> {/* Added relative for positioning favorite button */}
          <div className="aspect-[4/3] relative w-full overflow-hidden">
            <Image
              src={primaryImageUrl}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              data-ai-hint={imageHint}
            />
          </div>
          <div className="absolute top-2 right-2 z-10 opacity-80 group-hover/itemcard:opacity-100 transition-opacity">
            <FavoriteButtonClient itemId={item.id} className="bg-background/70 hover:bg-background/90" />
          </div>
        </CardHeader>
      </Link>
      <CardContent className="p-4 flex-grow">
        <Link href={`/items/${item.id}`} className="block">
          <CardTitle className="text-lg font-headline mb-2 hover:text-primary transition-colors truncate" title={item.name}>{item.name}</CardTitle>
        </Link>
        <p className="text-2xl font-bold text-primary mb-2">{item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        <div className="flex items-center text-sm text-muted-foreground mb-1">
          <Package className="h-4 w-4 mr-1 flex-shrink-0" />
          <span className="truncate" title={item.category}>{item.category}</span>
        </div>
        {item.location && (
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="truncate" title={item.location}>{item.location}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Link href={`/items/${item.id}`} className="w-full">
          <Badge variant="secondary" className="w-full justify-center py-2 hover:bg-accent hover:text-accent-foreground transition-colors">
            Voir les détails
          </Badge>
        </Link>
      </CardFooter>
    </Card>
  );
}
