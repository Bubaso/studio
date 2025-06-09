
import { getUserDocument } from '@/services/userService'; // Updated import
import { getUserListingsFromFirestore } from '@/services/itemService';
import type { UserProfile, Item } from '@/lib/types'; // UserProfile instead of User or Review
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ItemCard } from '@/components/item-card';
import { MapPin, CalendarDays, MessageSquare, Star } from 'lucide-react';
import Link from 'next/link';

interface UserProfilePageProps {
  params: { userId: string };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const user = await getUserDocument(params.userId); // Fetch user data from Firestore

  if (!user) {
    return <div className="text-center py-10">Utilisateur non trouvé. Vérifiez que l'UID est correct et que l'utilisateur existe dans Firestore.</div>;
  }

  const listings = await getUserListingsFromFirestore(user.uid);
  // Reviews are not part of UserProfile from Firestore for now.
  // const reviews = user.reviews || []; // This would require fetching reviews separately

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-primary">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.name || 'Utilisateur'} data-ai-hint={user.dataAiHint} />
            <AvatarFallback className="text-4xl">{(user.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary mb-2">{user.name || 'Utilisateur Anonyme'}</h1>
            {user.location && (
              <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-1">
                <MapPin className="h-4 w-4 mr-2" /> {user.location}
              </div>
            )}
            <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-2">
              <CalendarDays className="h-4 w-4 mr-2" /> Inscrit(e) le {new Date(user.joinedDate).toLocaleDateString('fr-FR')}
            </div>
            {/* Ratings are not currently part of UserProfile from Firestore
            {user.ratings && ( 
              <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-4">
                <Star className="h-5 w-5 mr-1 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">{user.ratings.value.toLocaleString('fr-FR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</span>
                <span className="ml-1">({user.ratings.count} évaluations)</span>
              </div>
            )}
            */}
             <Link href={`/messages/new?userId=${user.uid}`}>
                <Button variant="outline">
                    <MessageSquare className="mr-2 h-4 w-4" /> Contacter {user.name ? user.name.split(' ')[0] : 'le vendeur'}
                </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">Annonces de {user.name ? user.name.split(' ')[0] : 'cet utilisateur'} ({listings.length})</h2>
        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>{user.name || 'Cet utilisateur'} n'a pas encore mis d'articles en vente.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Reviews section is commented out as reviews are not fetched from Firestore for UserProfile yet
      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">Évaluations pour {user.name ? user.name.split(' ')[0] : 'cet utilisateur'} (0)</h2>
        <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>Les évaluations pour {user.name || 'cet utilisateur'} ne sont pas encore affichées.</p>
            </CardContent>
        </Card>
      </section>
      */}
    </div>
  );
}
