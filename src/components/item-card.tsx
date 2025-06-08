import Link from 'next/link';
import Image from 'next/image';
import type { Item } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <Link href={`/items/${item.id}`} className="block">
        <CardHeader className="p-0">
          <div className="aspect-[4/3] relative w-full overflow-hidden">
            <Image
              src={item.imageUrl}
              alt={item.name}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-300 group-hover:scale-105"
              data-ai-hint={item.dataAiHint}
            />
          </div>
        </CardHeader>
      </Link>
      <CardContent className="p-4 flex-grow">
        <Link href={`/items/${item.id}`} className="block">
          <CardTitle className="text-lg font-headline mb-2 hover:text-primary transition-colors truncate" title={item.name}>{item.name}</CardTitle>
        </Link>
        <p className="text-2xl font-bold text-primary mb-2">${item.price.toFixed(2)}</p>
        <div className="flex items-center text-sm text-muted-foreground mb-1">
          <Tag className="h-4 w-4 mr-1 flex-shrink-0" />
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
          <Badge variant="outline" className="w-full justify-center py-2 hover:bg-accent hover:text-accent-foreground transition-colors">
            View Details
          </Badge>
        </Link>
      </CardFooter>
    </Card>
  );
}
