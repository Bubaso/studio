
import Image from 'next/image';
import { getItemByIdFromFirestore, getItemsFromFirestore, getUserListingsFromFirestore } from '@/services/itemService';
import { getUserDocument } from '@/services/userService';
import type { UserProfile, Item, ItemCategory, DeliveryOption } from '@/lib/types'; 
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Package, MapPin, Clock, Flag, CheckCircle, Video, Phone, Truck, Bike, Car, CarFront, Handshake, Wallet, ShieldCheck } from 'lucide-react'; 
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ContactSellerButtonClient } from '@/components/contact-seller-button-client';
import { SellerActionsClient } from '@/components/seller-actions-client';
import { SimilarListingsCarousel } from '@/components/similar-listings-carousel';
import { auth } from '@/lib/firebase';
import { ItemViewLogger } from '@/components/item-view-logger';
import { ReportItemButton } from '@/components/report-item-button';
import { ItemMediaGallery } from '@/components/item-media-gallery';
import { WhatsAppShareButton } from '@/components/whatsapp-share-button';
import { ConfirmSoldStatusClient } from '@/components/confirm-sold-status-client';
import { SubscribeButton } from '@/components/SubscribeButton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ItemViewCount } from '@/components/item-view-count';
import { FavoriteButtonClient } from '@/components/favorite-button-client';

export const dynamic = 'force-dynamic';

interface ItemPageProps {
  params: { id: string; locale: string };
}

const deliveryOptionIcons: Record<DeliveryOption, React.ElementType> = {
  'Moto': Bike,
  'Voiture': Car,
  'Pickup': Truck,
  'Taxi Baggage': CarFront,
  'Camion': Truck,
  'Remise en main propre': Handshake,
};

const WhatsAppIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current">
        <title>WhatsApp</title>
        <path d="M12.04 2.015c-5.524 0-10 4.478-10 10.002 0 1.75.45 3.415 1.256 4.863L2.07 22.07l5.247-1.372a9.962 9.962 0 0 0 4.72 1.21h.005c5.524 0 10-4.478 10-10.002s-4.476-10-10-10.002zM12.04 20.116h-.005a8.144 8.144 0 0 1-4.155-1.18l-.297-.176-3.085.807.82-3.013-.194-.31a8.14 0 0 1-1.27-4.382c0-4.512 3.655-8.17 8.168-8.17s8.167 3.657 8.167 8.17c0 4.513-3.655 8.17-8.168 8.17zm4.49-5.838c-.247-.124-1.46-.718-1.688-.802-.227-.082-.392-.123-.556.124-.164.246-.638.802-.782.966-.144.164-.288.184-.535.062-.247-.124-.96-.35-1.83-1.125-.678-.598-1.14-1.334-1.275-1.562-.134-.228-.014-.35.11-.474.11-.11.247-.288.37-.432.124-.144.164-.246.246-.41.082-.164.04-.308-.02-.432-.06-.124-.556-1.34-.763-1.838-.207-.498-.415-.43-.557-.438-.144-.008-.308-.008-.473-.008a.892.892 0 0 0-.64.308c-.207.228-.782.763-.782 1.854s.8 2.148.922 2.312c.124.164 1.562 2.38 3.79 3.326.54.232.96.37 1.284.473.535.164 1.02.144 1.406.082.43-.072 1.265-.515 1.442-1.012.178-.498.178-.926.124-1.012-.05-.082-.174-.134-.42-.258z"></path>
    </svg>
);

export default async function ItemPage({ params }: ItemPageProps) {
  await setRequestLocale(params.locale);
  const t = await getTranslations('ItemDetailPage');
  const { id: itemId } = params; 
  
  if (!itemId) {
    return <div className="text-center py-10">{t('missingItemId')}</div>;
  }

  // First, fetch the main item. The other fetches depend on this data.
  const item = await getItemByIdFromFirestore(itemId);

  if (!item) {
    return (
        <Card className="max-w-xl mx-auto my-10">
            <CardHeader>
                <CardTitle className="text-destructive text-center">{t('itemNotFound')}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-muted-foreground mb-2">
                    {t('itemNotFoundDesc', { itemId })}
                </p>
                <Link href="/browse"><Button variant="outline">{t('backToListings')}</Button></Link>
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
  const sellerListingsPromise = getUserListingsFromFirestore(item.sellerId);


  // Await all promises concurrently
  const [
    seller,
    { items: fetchedSimilarItems },
    sellerListings,
  ] = await Promise.all([
    sellerPromise,
    similarItemsPromise,
    sellerListingsPromise,
  ]);
  
  const activeSellerListingsCount = sellerListings.filter(l => !l.isSold).length;

  // Process the results
  const similarItems = fetchedSimilarItems.filter(si => si.id !== itemId).slice(0, 7);

  const primaryImageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : 'https://placehold.co/600x400.png';
  const imageHint = item.dataAiHint || `${item.category} ${item.name.split(' ')[0]}`.toLowerCase();
  
  const SellerProfileCard = seller ? (
    <Link href={`/profile/${seller.uid}`} className="block group">
      <Card className="transition-shadow duration-200 group-hover:shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">{t('sellerInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={seller.avatarUrl || undefined} alt={seller.name || 'Vendeur'} data-ai-hint={seller.dataAiHint} />
            <AvatarFallback>{(seller.name || 'V').substring(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-lg group-hover:text-primary transition-colors break-words">
              {seller.name || t('anonymousSeller')}
            </div>
             <p className="text-sm text-muted-foreground">{t('joinedOn', { date: new Date(seller.joinedDate).toLocaleDateString('fr-FR') })}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  ) : (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl">{t('sellerInfo')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{t('sellerInfoUnavailable')}</p>
      </CardContent>
    </Card>
  );

  // Helper mapping for shippingPayer to handle potential legacy data
  const getShippingPayerTranslation = (payerValue?: string): string => {
    if (!payerValue) return '';
    const lowerPayer = payerValue.toLowerCase();

    // Map potential legacy (French) and current (English) values to the correct translation key
    const keyMap: { [key: string]: 'seller' | 'buyer' | 'shared' } = {
      'vendeur': 'seller',
      'acheteur': 'buyer',
      'partagé': 'shared',
      'seller': 'seller',
      'buyer': 'buyer',
      'shared': 'shared'
    };

    const translationKey = keyMap[lowerPayer];
    
    // If a valid key is found, translate it. Otherwise, return the original value as a fallback.
    return translationKey ? t(`shippingPayers.${translationKey}`) : payerValue;
  }


  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <ItemViewLogger item={item} />
      <ConfirmSoldStatusClient item={item} />

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Left Column: Image Gallery, Desktop Seller Info */}
        <div className="space-y-4">
            <ItemMediaGallery item={item} />
            <div className="mt-8 hidden md:block">{SellerProfileCard}</div>
        </div>

        {/* Right Column: Item Details, Actions */}
        <div className="space-y-6 min-w-0">
          <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground/70" />
                  <span>{t('publishedOn')} {new Date(item.postedDate).toLocaleDateString('fr-FR')}</span>
              </div>
              {item.lastUpdated && !item.isSold && (
                   <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground/70" />
                      <span>{t('lastModified')} {new Date(item.lastUpdated).toLocaleDateString('fr-FR')} à {new Date(item.lastUpdated).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</span>
                  </div>
              )}
               {item.isSold && item.soldAt && (
                   <div className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span>{t('soldOn')} {new Date(item.soldAt).toLocaleDateString('fr-FR')} à {new Date(item.soldAt).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'})}</span>
                  </div>
              )}
            </div>
          
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-headline text-primary break-words">{item.name}</h1>
          
          <div className="flex items-center gap-2 pt-2 !-mt-4">
            <ItemViewCount itemId={item.id} />
            <FavoriteButtonClient
              itemId={item.id}
              sellerId={item.sellerId}
              className="bg-background/70 hover:bg-background/90 h-7 w-7"
            />
          </div>

          <div className="flex justify-between items-center gap-4">
            <p className="text-2xl lg:text-3xl font-bold text-foreground whitespace-nowrap">{item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
            <WhatsAppShareButton item={item} />
          </div>

          {item.isSold && (
             <Badge variant="destructive" className="!mt-2 text-base py-1 px-3">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('itemSold')}
              </Badge>
          )}

          {item.suspectedSold && !item.isSold && (
              <Badge variant="destructive" className="!mt-2 text-base py-1 px-3">
                  <Flag className="h-4 w-4 mr-2" />
                  {t('unconfirmedSold')}
              </Badge>
          )}
          
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <Package className="h-4 w-4 mr-2" />
              {item.category}
            </Badge>
            {item.condition && (
                 <Badge variant="outline" className="text-sm py-1 px-3 capitalize">
                    {t('condition')} {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
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
              <CardTitle className="font-headline text-xl">{t('itemDescription')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap break-words">{item.description}</p>
            </CardContent>
          </Card>
          
          {/* Mobile-only Compact Seller Info */}
          <div className="md:hidden">
              {seller && (
                <div>
                  <div className="flex items-center gap-3 p-3 border-t border-b -mx-4 px-4 my-4">
                    <Link href={`/profile/${seller.uid}`} className="flex-1 flex items-center gap-3 overflow-hidden">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={seller.avatarUrl || undefined} alt={seller.name || 'Vendeur'} data-ai-hint={seller.dataAiHint} />
                        <AvatarFallback>{(seller.name || 'V').substring(0,1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-md hover:text-primary transition-colors truncate">
                        {seller.name || t('anonymousSeller')}
                      </span>
                    </Link>
                    <SubscribeButton targetUserId={seller.uid} />
                  </div>
                  {activeSellerListingsCount > 1 && (
                      <Link href={`/profile/${seller.uid}`} className="block -mt-4 mb-4">
                          <Badge variant="secondary">
                              {t('sellerActiveListings', { count: activeSellerListingsCount -1 })}
                          </Badge>
                      </Link>
                  )}
                </div>
              )}
            </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">{t('deliveryDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                {(item.deliveryOptions && item.deliveryOptions.length > 0) ? (
                    item.deliveryOptions.map((option) => {
                        const Icon = deliveryOptionIcons[option] || Package;
                        return (
                            <Badge key={option} variant="outline" className="text-sm py-1 px-3">
                                <Icon className="h-4 w-4 mr-2" />
                                {option}
                            </Badge>
                        )
                    })
                ) : null}
                {item.shippingPayer && (
                    <Badge variant="outline" className="text-sm py-1 px-3">
                        <Wallet className="h-4 w-4 mr-2" />
                        <span>{t('paidByLabel')} <strong>{getShippingPayerTranslation(item.shippingPayer)}</strong></span>
                    </Badge>
                )}
                {(!item.deliveryOptions || item.deliveryOptions.length === 0) && !item.shippingPayer && (
                    <p className="text-sm text-muted-foreground">{t('noDeliveryDetails')}</p>
                )}
            </CardContent>
          </Card>

          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4">
            {item && item.sellerId && !item.isSold && (
                <ContactSellerButtonClient sellerId={item.sellerId} itemId={itemId} className="h-16 text-lg md:h-12 md:text-base" />
            )}
            {item.phoneNumber && !item.isSold && (
                <Button asChild variant="default" className="w-full flex-1 h-16 text-lg md:h-12 md:text-base bg-green-600 hover:bg-green-700">
                    <a href={`tel:${item.phoneNumber}`}>
                        <Phone className="mr-2 h-5 w-5" /> {t('callSeller')}
                    </a>
                </Button>
            )}
            {item.whatsappNumber && !item.isSold && (
                <Button asChild variant="default" className="w-full flex-1 h-16 text-lg md:h-12 md:text-base bg-green-500 hover:bg-green-600">
                    <a href={`https://wa.me/${item.whatsappNumber.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                       <WhatsAppIcon /> <span className="ml-2">{t('contactOnWhatsApp')}</span>
                    </a>
                </Button>
            )}
          </div>
          
          {similarItems.length > 0 && (
            <section className="space-y-4 pt-4 border-t"> 
              <h2 className="text-2xl font-bold font-headline text-primary">{t('similarItems')}</h2>
              <SimilarListingsCarousel items={similarItems} currentItemId={itemId} />
            </section>
          )}
          
          {item && <SellerActionsClient item={item} />}


          {item && item.sellerId && !item.isSold && (
            <div className="pt-4 text-center border-t border-dashed">
              <ReportItemButton itemId={itemId} sellerId={item.sellerId} />
            </div>
          )}

          <Alert variant="default" className="mt-6 bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300">
            <ShieldCheck className="h-5 w-5 !text-yellow-800 dark:!text-yellow-300" />
            <AlertTitle className="font-bold">{t('safetyTips')}</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>{t('safetyTip1')}</li>
                <li>{t('safetyTip2')}</li>
                <li>{t('safetyTip3')}</li>
                <li>{t('safetyTip4')}</li>
              </ul>
            </AlertDescription>
          </Alert>
          
        </div>
      </div> 
    </div>
  );
}

