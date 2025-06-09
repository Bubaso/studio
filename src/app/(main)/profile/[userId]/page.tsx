
import { getMockUserById } from '@/lib/mock-data'; // User data still mock for now
import { getUserListingsFromFirestore } from '@/services/itemService'; // Updated import
import type { User, Item, Review } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ItemCard } from '@/components/item-card';
import { MapPin, CalendarDays, Star, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface UserProfilePageProps {
  params: { userId: string };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const user = await getMockUserById(params.userId); // User data still mock

  if (!user) {
    return <div className="text-center py-10">Utilisateur non trouvé.</div>;
  }

  // Fetch user's listings from Firestore
  const listings = await getUserListingsFromFirestore(user.id);
  const reviews = user.reviews || []; // Reviews still mock

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-primary">
            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint={user.dataAiHint} />
            <AvatarFallback className="text-4xl">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary mb-2">{user.name}</h1>
            {user.location && (
              <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-1">
                <MapPin className="h-4 w-4 mr-2" /> {user.location}
              </div>
            )}
            <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-2">
              <CalendarDays className="h-4 w-4 mr-2" /> Inscrit(e) le {new Date(user.joinedDate).toLocaleDateString('fr-FR')}
            </div>
            {user.ratings && (
              <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-4">
                <Star className="h-5 w-5 mr-1 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">{user.ratings.value.toLocaleString('fr-FR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</span>
                <span className="ml-1">({user.ratings.count} évaluations)</span>
              </div>
            )}
             <Link href={`/messages/new?userId=${user.id}`}>
                <Button variant="outline">
                    <MessageSquare className="mr-2 h-4 w-4" /> Contacter {user.name.split(' ')[0]}
                </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">Annonces de {user.name.split(' ')[0]} ({listings.length})</h2>
        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>{user.name} n'a pas encore mis d'articles en vente. Vérifiez Firestore.</p>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">Évaluations pour {user.name.split(' ')[0]} ({reviews.length})</h2>
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center mb-2">
                     <Avatar className="h-8 w-8 mr-3">
                        <AvatarFallback>{review.reviewerName.substring(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{review.reviewerName}</p>
                        <div className="flex">
                        {Array(5).fill(0).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50'}`} />
                        ))}
                        </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-1 text-sm">{review.comment}</p>
                  <p className="text-xs text-muted-foreground/80">{new Date(review.date).toLocaleDateString('fr-FR')}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>{user.name} n'a pas encore d'évaluations.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
