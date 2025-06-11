
import Image from 'next/image';
import { getItemByIdFromFirestore, getItemsFromFirestore } from '@/services/itemService';
import { getUserDocument } from '@/services/userService';
import type { UserProfile, Review, Item, ItemCategory } from '@/lib/types'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, MapPin, Star, MessageSquarePlus, Clock } from 'lucide-react'; 
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ContactSellerButtonClient } from '@/components/contact-seller-button-client';
import { getReviewsForItem } from '@/services/reviewService'; 
import { ReviewForm } from '@/components/review-form'; 
import { EditItemButtonClient } from '@/components/edit-item-button-client';
import { PurchaseItemButtonClient } from '@/components/purchase-item-button-client';
import { FavoriteButtonClient } from '@/components/favorite-button-client';
import { SimilarListingsCarousel } from '@/components/similar-listings-carousel';

interface ItemPageProps {
  params: { id: string };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const item = await getItemByIdFromFirestore(params.id);

  if (!item) {
    return <div className="text-center py-10">Article non trouvé ou ID invalide. Vérifiez Firestore.</div>;
  }

  let seller: UserProfile | null = null;
  try {
    if (item.sellerId && typeof item.sellerId === 'string' && item.sellerId.trim() !== '' && !item.sellerId.includes('/')) {
      seller = await getUserDocument(item.sellerId);
    } else {
      console.warn(`Item ${item.id} has an invalid or missing sellerId: ${String(item.sellerId)}`);
    }
  } catch (error: any) {
    const sellerIdString = String(item?.sellerId); 
    if (error && typeof error === 'object' && 'code' in error && error.code === 'permission-denied') {
        console.warn(`Permission denied fetching seller (ID: ${sellerIdString}) for item ${item?.id || 'unknown'}. Check Firestore rules for 'users' collection.`);
        seller = null; 
    } else {
        let errorMessageLog = `Unexpected error fetching seller (ID: ${sellerIdString}) for item ${item?.id || 'unknown'}.`;
        if (error instanceof Error) {
            errorMessageLog += ` Message: ${error.message}.`;
        } else {
            errorMessageLog += ` Details: ${String(error)}.`;
        }
        console.error(errorMessageLog);
        seller = null; 
    }
  }

  let reviews: Review[] = [];
  try {
    reviews = await getReviewsForItem(item.id);
  } catch (error: any) {
    console.error(`Error fetching reviews for item ${item.id}. Check Firestore rules for 'reviews' collection.`, error);
  }
  
  const primaryImageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : 'https://placehold.co/600x400.png';
  const otherImageUrls = (item.imageUrls && item.imageUrls.length > 1) ? item.imageUrls.slice(1) : [];
  const imageHint = item.dataAiHint || `${item.category} ${item.name.split(' ')[0]}`.toLowerCase();

  let similarItems: Item[] = [];
  if (item) {
    const priceMin = Math.round(item.price * 0.8);
    const priceMax = Math.round(item.price * 1.2);

    const fetchedSimilarItems = await getItemsFromFirestore({
      category: item.category as ItemCategory,
      priceMin: priceMin,
      priceMax: priceMax,
      count: 10, 
    });
    similarItems = fetchedSimilarItems.filter(si => si.id !== item.id).slice(0, 7);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-4">
          <Card className="shadow-lg rounded-lg overflow-hidden">
            <div className="relative aspect-video">
              <Image
                src={primaryImageUrl}
                alt={item.name}
                fill
                className="object-cover"
                data-ai-hint={imageHint}
                priority
              />
            </div>
          </Card>
          {otherImageUrls.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {otherImageUrls.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-md overflow-hidden border hover:opacity-80 transition-opacity">
                  <Image
                    src={url}
                    alt={`${item.name} - image ${index + 2}`}
                    fill
                    className="object-cover"
                    data-ai-hint={imageHint}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <h1 className="text-4xl font-bold font-headline text-primary flex-1_">{item.name}</h1>
            <FavoriteButtonClient itemId={item.id} size="lg" className="ml-4" />
          </div>
          <p className="text-3xl font-bold text-foreground">{item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          
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

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Description de l'article</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{item.description}</p>
            </CardContent>
          </Card>
          
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
                  <Link href={`/profile/${seller.uid}`} className="font-semibold text-lg hover:text-primary transition-colors">
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

          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
            {item && item.sellerId && (
                <PurchaseItemButtonClient sellerId={item.sellerId} itemId={item.id} />
            )}
            {item && item.sellerId && (
                <ContactSellerButtonClient sellerId={item.sellerId} itemId={item.id} />
            )}
             {item && item.sellerId && (
                <EditItemButtonClient sellerId={item.sellerId} itemId={item.id} />
            )}
          </div>
          
           <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground/70" />
                <span>Publié le : {new Date(item.postedDate).toLocaleDateString('fr-FR')}</span>
            </div>
            {item.lastUpdated && (
                 <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground/70" />
                    <span>Dernière modification : {new Date(item.lastUpdated).toLocaleDateString('fr-FR')} à {new Date(item.lastUpdated).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</span>
                </div>
            )}
          </div>
        </div>
      </div>
      
      {similarItems.length > 0 && (
        <section className="space-y-4 pt-8 border-t">
          <h2 className="text-2xl font-bold font-headline text-primary">Articles similaires</h2>
          <SimilarListingsCarousel items={similarItems} />
        </section>
      )}

      <section className="space-y-6 pt-8 border-t">
        <h2 className="text-3xl font-bold font-headline text-primary">Avis sur l'article ({reviews.length})</h2>
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="shadow-sm">
                <CardHeader className="flex flex-row justify-between items-start pb-2">
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={review.reviewerAvatarUrl || undefined} alt={review.reviewerName} data-ai-hint="profil personne" />
                            <AvatarFallback>{review.reviewerName.substring(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold">{review.reviewerName}</p>
                            <p className="text-xs text-muted-foreground">
                                {new Date(review.createdAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center">
                        {Array(5).fill(0).map((_, i) => (
                            <Star key={i} className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
                        ))}
                    </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">{review.comment}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <MessageSquarePlus className="h-12 w-12 mx-auto mb-3 text-primary/50" />
              <p>Cet article n'a pas encore reçu d'avis.</p>
              <p className="text-sm">Soyez le premier à partager votre expérience !</p>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-4 pt-8 border-t">
         <h3 className="text-2xl font-bold font-headline text-primary">Laissez votre avis</h3>
        <ReviewForm itemId={item.id} sellerId={item.sellerId} hasUserAlreadyReviewed={false} />
      </section>

    </div>
  );
}
