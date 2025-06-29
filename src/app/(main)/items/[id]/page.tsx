
import Image from 'next/image';
import { getItemByIdFromFirestore, getItemsFromFirestore } from '@/services/itemService';
import { getUserDocument } from '@/services/userService';
import type { UserProfile, Item, ItemCategory, DeliveryOption } from '@/lib/types'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, MapPin, Clock, Flag, CheckCircle, Video, Phone, Truck, Bike, Car, CarFront } from 'lucide-react'; 
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ContactSellerButtonClient } from '@/components/contact-seller-button-client';
import { SellerActionsClient } from '@/components/seller-actions-client';
import { FavoriteButtonClient } from '@/components/favorite-button-client';
import { SimilarListingsCarousel } from '@/components/similar-listings-carousel';
import { auth } from '@/lib/firebase';
import { ItemViewLogger } from '@/components/item-view-logger';
import { ItemStatsDisplay } from '@/components/item-stats-display';
import { ReportItemButton } from '@/components/report-item-button';
import { ItemMediaGallery } from '@/components/item-media-gallery';
import { WhatsAppShareButton } from '@/components/whatsapp-share-button';

interface ItemPageProps {
  params: { id: string };
}

const deliveryOptionIcons: Record<DeliveryOption, React.ElementType> = {
  'Moto': Bike,
  'Voiture': Car,
  'Pickup': Truck,
  'Taxi Baggage': CarFront,
  'Camion': Truck,
};

export default async function ItemPage({ params }: ItemPageProps) {
  const { id: itemId } = params; 
  
  if (!itemId) {
    return <div className="text-center py-10">ID d'article manquant.</div>;
  }

  // First, fetch the main item. The other fetches depend on this data.
  const item = await getItemByIdFromFirestore(itemId);

  if (!item) {
    return (
        <Card className="max-w-xl mx-auto my-10">
            <CardHeader>
                <CardTitle className="text-destructive text-center">Article non trouvé</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-muted-foreground mb-2">
                    L'article avec l'ID "{itemId}" n'existe pas ou a été supprimé.
                </p>
                <Link href="/browse"><Button variant="outline">Retourner aux annonces</Button></Link>
            </CardContent>
        </Card>
    );
  }
  
  // Prepare all other data fetching promises to run in parallel.
  const sellerPromise = getUserDocument(item.sellerId);
  const similarItemsPromise = (item.price !== undefined && item.category) ? getItemsFromFirestore({
      category: item.category as ItemCategory,
      priceMin: Math.round(item.price * 0.8),
      priceMax: Math.round(item.price * 1.2),
      pageSize: 10, 
    }) : Promise.resolve({ items: [], lastItemId: null, hasMore: false });

  // Await all promises concurrently
  const [
    seller,
    { items: fetchedSimilarItems }
  ] = await Promise.all([
    sellerPromise,
    similarItemsPromise
  ]);

  // Process the results
  const similarItems = fetchedSimilarItems.filter(si => si.id !== itemId).slice(0, 7);

  const primaryImageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : 'https://placehold.co/600x400.png';
  const imageHint = item.dataAiHint || `${item.category} ${item.name.split(' ')[0]}`.toLowerCase();


  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <ItemViewLogger item={item} />

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column: Image Gallery & Video */}
        <div className="space-y-4">
            <ItemMediaGallery item={item} />
        </div>

        {/* Right Column: Item Details, Seller Info, Actions */}
        <div className="space-y-6 min-w-0">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-headline text-primary break-words flex-1">{item.name}</h1>
            <p className="text-2xl lg:text-3xl font-bold text-foreground whitespace-nowrap">{item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          </div>

          {item.isSold && (
             <Badge variant="destructive" className="mt-2 text-base py-1 px-3">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Cet article a été vendu
              </Badge>
          )}

          {item.suspectedSold && !item.isSold && (
              <Badge variant="destructive" className="mt-2 text-base py-1 px-3">
                  <Flag className="h-4 w-4 mr-2" />
                  Non confirmé : peut être vendu
              </Badge>
          )}
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <Package className="h-4 w-4 mr-2" />
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
          
          {item.deliveryOptions && item.deliveryOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
                {item.deliveryOptions.map((option) => {
                    const Icon = deliveryOptionIcons[option];
                    return (
                        <Badge key={option} variant="outline" className="text-sm py-1 px-3">
                            <Icon className="h-4 w-4 mr-2" />
                            {option}
                        </Badge>
                    )
                })}
            </div>
          )}

          <div className="flex items-center gap-2">
            <FavoriteButtonClient itemId={itemId} sellerId={item.sellerId} size="default" />
            <WhatsAppShareButton item={item} />
          </div>
          
          <ItemStatsDisplay itemId={itemId} sellerId={item.sellerId} />

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Description de l'article</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap break-words">{item.description}</p>
            </CardContent>
          </Card>
          
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
            {item && item.sellerId && !item.isSold && (
                <ContactSellerButtonClient sellerId={item.sellerId} itemId={itemId} />
            )}
            {item.phoneNumber && !item.isSold && (
                <Button asChild variant="default" className="w-full flex-1 h-16 text-lg md:h-12 md:text-base bg-green-600 hover:bg-green-700">
                    <a href={`tel:${item.phoneNumber}`}>
                        <Phone className="mr-2 h-5 w-5" /> Appeler le vendeur
                    </a>
                </Button>
            )}
          </div>
          
          {similarItems.length > 0 && (
            <section className="space-y-4 pt-4 border-t"> 
              <h2 className="text-2xl font-bold font-headline text-primary">Articles similaires</h2>
              <SimilarListingsCarousel items={similarItems} currentItemId={itemId} />
            </section>
          )}
          
          {seller ? (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-xl">Informations sur le vendeur</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={seller.avatarUrl || undefined} alt={seller.name || 'Vendeur'} data-ai-hint={seller.dataAiHint} />
                  <AvatarFallback>{(seller.name || 'V').substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <Link href={`/profile/${seller.uid}`} className="font-semibold text-lg hover:text-primary transition-colors break-words">
                    {seller.name || 'Vendeur Anonyme'}
                  </Link>
                   <p className="text-sm text-muted-foreground">Inscrit le : {new Date(seller.joinedDate).toLocaleDateString('fr-FR')}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-xl">Informations sur le vendeur</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Informations sur le vendeur non disponibles ou le vendeur n'a pas été trouvé.</p>
              </CardContent>
            </Card>
          )}
          
          {item && <SellerActionsClient item={item} />}


          {item && item.sellerId && !item.isSold && (
            <div className="pt-4 text-center border-t border-dashed">
              <ReportItemButton itemId={itemId} sellerId={item.sellerId} />
            </div>
          )}
          
           <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground/70" />
                <span>Publié le : {new Date(item.postedDate).toLocaleDateString('fr-FR')}</span>
            </div>
             {item.soldAt && (
                 <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Vendu le : {new Date(item.soldAt).toLocaleDateString('fr-FR')} à {new Date(item.soldAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</span>
                </div>
            )}
            {item.lastUpdated && !item.soldAt && (
                 <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground/70" />
                    <span>Dernière modification : {new Date(item.lastUpdated).toLocaleDateString('fr-FR')} à {new Date(item.lastUpdated).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</span>
                </div>
            )}
          </div>
        </div>
      </div> 
    </div>
  );
}
