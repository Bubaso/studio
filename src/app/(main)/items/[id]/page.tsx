
import Image from 'next/image';
import { getItemByIdFromFirestore, getItemsFromFirestore } from '@/services/itemService';
import { getUserDocument } from '@/services/userService';
import type { UserProfile, Review, Item, ItemCategory } from '@/lib/types'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, MapPin, Star, MessageSquarePlus, Clock, Flag, CheckCircle, Video } from 'lucide-react'; 
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ContactSellerButtonClient } from '@/components/contact-seller-button-client';
import { getReviewsForItem, checkIfUserHasReviewedItem } from '@/services/reviewService'; 
import { ReviewForm } from '@/components/review-form'; 
import { SellerActionsClient } from '@/components/seller-actions-client';
import { FavoriteButtonClient } from '@/components/favorite-button-client';
import { SimilarListingsCarousel } from '@/components/similar-listings-carousel';
import { auth } from '@/lib/firebase';
import { ItemViewLogger } from '@/components/item-view-logger';
import { ItemStatsDisplay } from '@/components/item-stats-display';
import { ReportItemButton } from '@/components/report-item-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ItemPageProps {
  params: { id: string };
}

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

  const currentUser = auth.currentUser;
  
  // Prepare all other data fetching promises to run in parallel.
  const sellerPromise = getUserDocument(item.sellerId);
  const reviewsPromise = getReviewsForItem(itemId);
  const hasUserAlreadyReviewedPromise = currentUser ? checkIfUserHasReviewedItem(currentUser.uid, itemId) : Promise.resolve(false);
  const similarItemsPromise = (item.price !== undefined && item.category) ? getItemsFromFirestore({
      category: item.category as ItemCategory,
      priceMin: Math.round(item.price * 0.8),
      priceMax: Math.round(item.price * 1.2),
      pageSize: 10, 
    }) : Promise.resolve({ items: [], lastItemId: null });

  // Await all promises concurrently
  const [
    seller,
    reviews,
    hasUserAlreadyReviewedInitial,
    { items: fetchedSimilarItems }
  ] = await Promise.all([
    sellerPromise,
    reviewsPromise,
    hasUserAlreadyReviewedPromise,
    similarItemsPromise
  ]);

  // Process the results
  const similarItems = fetchedSimilarItems.filter(si => si.id !== itemId).slice(0, 7);

  const primaryImageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : 'https://placehold.co/600x400.png';
  const imageHint = item.dataAiHint || `${item.category} ${item.name.split(' ')[0]}`.toLowerCase();


  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <ItemViewLogger itemId={itemId} />

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column: Image Gallery & Video */}
        <div className="space-y-4">
          
          {item.videoUrl ? (
            <Card className="shadow-lg rounded-lg overflow-hidden">
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="relative aspect-video bg-black cursor-pointer group">
                            <video
                                src={item.videoUrl}
                                controls
                                className="w-full h-full object-contain"
                                preload="metadata"
                            >
                                Votre navigateur ne supporte pas la lecture de vidéos.
                            </video>
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Video className="h-12 w-12 text-white" />
                            </div>
                        </div>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] p-1 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                        <DialogHeader>
                            <DialogTitle className="sr-only">Aperçu de la vidéo</DialogTitle>
                        </DialogHeader>
                        <video src={item.videoUrl} controls autoPlay className="w-full h-full object-contain rounded-md" />
                    </DialogContent>
                </Dialog>
            </Card>
          ) : (
            <Card className="shadow-lg rounded-lg overflow-hidden">
                <Dialog>
                    <DialogTrigger asChild>
                        <div className="relative aspect-video cursor-pointer">
                            <Image
                                src={primaryImageUrl}
                                alt={item.name}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover"
                                data-ai-hint={imageHint}
                                priority
                            />
                            {item.isSold && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-4">
                                    <Badge variant="destructive" className="text-base sm:text-lg py-2 px-4 border-2 border-white/50 transform-gpu scale-110">
                                        <CheckCircle className="h-5 w-5 mr-2" /> VENDU
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] p-1 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                         <DialogHeader>
                           <DialogTitle className="sr-only">Aperçu de l'image : {item.name}</DialogTitle>
                        </DialogHeader>
                        <div className="relative w-full h-full">
                            <Image src={primaryImageUrl} alt={item.name} fill className="object-contain rounded-md" />
                        </div>
                    </DialogContent>
                </Dialog>
            </Card>
          )}

          {/* Image thumbnails (always show if they exist) - REORDERED */}
          {(item.imageUrls?.length > 0 || item.videoUrl) && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {/* Image thumbnails first */}
              {item.imageUrls && item.imageUrls.map((url, index) => (
                <Dialog key={index}>
                    <DialogTrigger asChild>
                        <div className="relative aspect-square rounded-md overflow-hidden border hover:opacity-80 transition-opacity cursor-pointer">
                          <Image
                            src={url}
                            alt={`${item.name} - image ${index + 1}`}
                            fill
                            sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                            className="object-cover"
                            data-ai-hint={imageHint}
                          />
                        </div>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] p-1 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                         <DialogHeader>
                           <DialogTitle className="sr-only">Aperçu de l'image {index + 1}</DialogTitle>
                        </DialogHeader>
                        <div className="relative w-full h-full">
                            <Image src={url} alt={`${item.name} - image ${index + 1}`} fill className="object-contain rounded-md"/>
                        </div>
                    </DialogContent>
                </Dialog>
              ))}
              {/* Video thumbnail last */}
              {item.videoUrl && (
                 <Dialog>
                    <DialogTrigger asChild>
                        <div className="relative aspect-square rounded-md overflow-hidden border-2 border-primary/50 cursor-pointer bg-black flex items-center justify-center hover:bg-zinc-800 transition-colors">
                           <Video className="h-10 w-10 text-white" />
                        </div>
                    </DialogTrigger>
                    <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] p-1 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                        <DialogHeader>
                            <DialogTitle className="sr-only">Aperçu de la vidéo</DialogTitle>
                        </DialogHeader>
                        <video src={item.videoUrl} controls autoPlay className="w-full h-full object-contain rounded-md" />
                    </DialogContent>
                 </Dialog>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Item Details, Seller Info, Actions */}
        <div className="space-y-6">
          <div className="flex justify-between items-start gap-4">
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
          
          <FavoriteButtonClient itemId={itemId} size="sm" />

          <ItemStatsDisplay itemId={itemId} sellerId={item.sellerId} />

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Description de l'article</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{item.description}</p>
            </CardContent>
          </Card>
          
          {similarItems.length > 0 && (
            <section className="space-y-4"> 
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
            {item && item.sellerId && !item.isSold && (
                <ContactSellerButtonClient sellerId={item.sellerId} itemId={itemId} />
            )}
          </div>
          
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
        <ReviewForm itemId={itemId} sellerId={item.sellerId} hasUserAlreadyReviewed={hasUserAlreadyReviewedInitial} />
      </section>

    </div>
  );
}
