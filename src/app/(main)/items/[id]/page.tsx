
import Image from 'next/image';
import Link from 'next/link';
import { getMockItemById, getMockUserById } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tag, MapPin, MessageSquare, Star, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ItemPageProps {
  params: { id: string };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const item = await getMockItemById(params.id);

  if (!item) {
    return <div className="text-center py-10">Article non trouvé.</div>;
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
          <p className="text-3xl font-bold text-foreground">{item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF' })}</p>
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <Tag className="h-4 w-4 mr-2" />
              {item.category}
            </Badge>
            {item.condition && (
                 <Badge variant="outline" className="text-sm py-1 px-3 capitalize">
                    État : {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
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
              <CardTitle className="font-headline text-xl">Description de l'article</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{item.description}</p>
            </CardContent>
          </Card>
          
          {seller && (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-xl">Informations sur le vendeur</CardTitle>
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
                      {seller.ratings.value.toLocaleString('fr-FR', {minimumFractionDigits: 1, maximumFractionDigits: 1})} ({seller.ratings.count} évaluations)
                    </div>
                  )}
                   <p className="text-sm text-muted-foreground">Inscrit le : {new Date(seller.joinedDate).toLocaleDateString('fr-FR')}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex space-x-4">
            <Button size="lg" className="flex-1">
              <ShoppingCart className="mr-2 h-5 w-5" /> Acheter maintenant
            </Button>
            <Link href={`/messages/new?userId=${seller?.id}&itemId=${item.id}`} className="flex-1">
              <Button size="lg" variant="outline" className="w-full">
                <MessageSquare className="mr-2 h-5 w-5" /> Contacter le vendeur
              </Button>
            </Link>
          </div>
          
           <div className="text-sm text-muted-foreground">
            Publié le : {new Date(item.postedDate).toLocaleDateString('fr-FR')}
          </div>
        </div>
      </div>
    </div>
  );
}
