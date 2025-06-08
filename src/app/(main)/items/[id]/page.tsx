import Image from 'next/image';
import Link from 'next/link';
import { getMockItemById, getMockUserById } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tag, MapPin, MessageSquare, Star, ShoppingCart, User as UserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ItemPageProps {
  params: { id: string };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const item = await getMockItemById(params.id);

  if (!item) {
    return <div className="text-center py-10">Item not found.</div>;
  }

  const seller = await getMockUserById(item.sellerId);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <Card className="shadow-lg rounded-lg overflow-hidden">
          <div className="relative aspect-video">
            <Image
              src={item.imageUrl}
              alt={item.name}
              layout="fill"
              objectFit="cover"
              data-ai-hint={item.dataAiHint}
            />
          </div>
        </Card>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold font-headline text-primary">{item.name}</h1>
          <p className="text-3xl font-bold text-foreground">${item.price.toFixed(2)}</p>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <Tag className="h-4 w-4 mr-2" />
              {item.category}
            </Badge>
            {item.condition && (
                 <Badge variant="outline" className="text-sm py-1 px-3 capitalize">
                    Condition: {item.condition}
                </Badge>
            )}
            {item.location && (
              <Badge variant="outline" className="text-sm py-1 px-3">
                <MapPin className="h-4 w-4 mr-2" />
                {item.location}
              </Badge>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Item Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{item.description}</p>
            </CardContent>
          </Card>
          
          {seller && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-xl">Seller Information</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={seller.avatarUrl} alt={seller.name} data-ai-hint={seller.dataAiHint} />
                  <AvatarFallback>{seller.name.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <Link href={`/profile/${seller.id}`} className="font-semibold text-lg hover:text-primary transition-colors">
                    {seller.name}
                  </Link>
                  {seller.ratings && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-4 w-4 mr-1 text-yellow-400 fill-yellow-400" />
                      {seller.ratings.value.toFixed(1)} ({seller.ratings.count} ratings)
                    </div>
                  )}
                   <p className="text-sm text-muted-foreground">Joined: {new Date(seller.joinedDate).toLocaleDateString()}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex space-x-4">
            <Button size="lg" className="flex-1">
              <ShoppingCart className="mr-2 h-5 w-5" /> Buy Now
            </Button>
            <Link href={`/messages/new?userId=${seller?.id}&itemId=${item.id}`} className="flex-1">
              <Button size="lg" variant="outline" className="w-full">
                <MessageSquare className="mr-2 h-5 w-5" /> Message Seller
              </Button>
            </Link>
          </div>
          
           <div className="text-sm text-muted-foreground">
            Posted on: {new Date(item.postedDate).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
