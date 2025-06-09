
import Image from 'next/image';
import { getItemByIdFromFirestore } from '@/services/itemService';
import { getUserDocument } from '@/services/userService';
import type { UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tag, MapPin, MessageSquare, Star, ShoppingCart, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/firebase';
import { createOrGetThreadAndRedirect } from '@/actions/messageActions';
import Link from 'next/link';

// Imports for the new Client Component
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface ItemPageProps {
  params: { id: string };
}

// Client Component for the Contact Seller Button
function ContactSellerButtonClient({ sellerId, itemId }: { sellerId: string; itemId: string }) {
  "use client";

  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoadingAuth) {
    return (
      <Button size="lg" variant="outline" className="w-full" disabled>
        <MessageSquare className="mr-2 h-5 w-5" /> Chargement...
      </Button>
    );
  }

  if (currentUser && currentUser.uid === sellerId) {
    return null; // Don't show button if it's the seller's own item
  }

  if (!currentUser) {
    // User is not logged in, show a button to redirect to login
    // Include redirect query param to come back to the item page after login
    const redirectTo = `/auth/signin?redirect=/items/${itemId}`;
    return (
      <Button size="lg" variant="outline" className="w-full" onClick={() => router.push(redirectTo)}>
        <MessageSquare className="mr-2 h-5 w-5" /> Contacter le vendeur (Connexion requise)
      </Button>
    );
  }

  // User is logged in and is not the seller
  return (
    <form action={async () => {
      // currentUser is guaranteed to be non-null here due to the checks above
      await createOrGetThreadAndRedirect(currentUser.uid, sellerId, itemId);
    }}>
      <Button type="submit" size="lg" variant="outline" className="w-full">
        <MessageSquare className="mr-2 h-5 w-5" /> Contacter le vendeur
      </Button>
    </form>
  );
}


export default async function ItemPage({ params }: ItemPageProps) {
  const item = await getItemByIdFromFirestore(params.id);
  // auth.currentUser in a Server Component might be null if auth state is client-side only.
  // The ContactSellerButtonClient will handle its own auth state.

  if (!item) {
    return <div className="text-center py-10">Article non trouvé ou ID invalide. Vérifiez Firestore.</div>;
  }

  const seller: UserProfile | null = await getUserDocument(item.sellerId);
  const primaryImageUrl = (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : 'https://placehold.co/600x400.png';
  const otherImageUrls = (item.imageUrls && item.imageUrls.length > 1) ? item.imageUrls.slice(1) : [];
  const imageHint = item.dataAiHint || `${item.category} ${item.name.split(' ')[0]}`.toLowerCase();

  return (
    <div className="max-w-6xl mx-auto">
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
          <h1 className="text-4xl font-bold font-headline text-primary">{item.name}</h1>
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
                <p className="text-muted-foreground">Vendeur non trouvé.</p>
              </CardContent>
            </Card>
          )}

          <div className="flex space-x-4">
            <Button size="lg" className="flex-1">
              <ShoppingCart className="mr-2 h-5 w-5" /> Acheter maintenant
            </Button>
            {/* Render the client component for contact button */}
            {seller && (
                <ContactSellerButtonClient sellerId={seller.uid} itemId={item.id} />
            )}
          </div>
          
           <div className="text-sm text-muted-foreground">
            Publié le : {new Date(item.postedDate).toLocaleDateString('fr-FR')}
          </div>
        </div>
      </div>
    </div>
  );
}
