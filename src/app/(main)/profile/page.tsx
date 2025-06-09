
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { getUserDocument } from '@/services/userService';
import { getUserListingsFromFirestore } from '@/services/itemService';
import type { UserProfile, Item, Review } from '@/lib/types'; // Updated User to UserProfile
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ItemCard } from '@/components/item-card';
import { Edit3, MapPin, CalendarDays, Star, LogIn, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function UserProfileContent({ user, listings, reviews }: { user: UserProfile; listings: Item[]; reviews: Review[] }) {
  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-primary">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.name || 'User'} data-ai-hint={user.dataAiHint} />
            <AvatarFallback className="text-4xl">{(user.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary mb-2">{user.name || 'Utilisateur'}</h1>
            {user.location && (
              <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-1">
                <MapPin className="h-4 w-4 mr-2" /> {user.location}
              </div>
            )}
            <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-2">
              <CalendarDays className="h-4 w-4 mr-2" /> Inscrit(e) le {new Date(user.joinedDate).toLocaleDateString('fr-FR')}
            </div>
            {/* Ratings are not part of UserProfile yet, can be added later */}
            {/* {user.ratings && (
              <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-4">
                <Star className="h-5 w-5 mr-1 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">{user.ratings.value.toLocaleString('fr-FR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</span>
                <span className="ml-1">({user.ratings.count} évaluations)</span>
              </div>
            )} */}
            <Button variant="outline">
              <Edit3 className="mr-2 h-4 w-4" /> Modifier le profil
            </Button>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">Mes annonces ({listings.length})</h2>
        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>Vous n'avez pas encore mis d'articles en vente.</p>
              <ul className="list-disc list-inside text-left my-2">
                 <li>Assurez-vous que les articles que vous avez créés dans Firestore ont un champ `sellerId` qui correspond à votre UID ({user.uid}).</li>
                 <li>Le champ `postedDate` doit être un Timestamp valide.</li>
              </ul>
              <Link href="/sell" className="text-primary hover:underline">
                Publiez votre premier article !
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">Mes évaluations ({reviews.length})</h2>
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center mb-2">
                    {Array(5).fill(0).map((_, i) => (
                        <Star key={i} className={`h-5 w-5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50'}`} />
                    ))}
                    <span className="ml-2 text-sm font-semibold">{review.reviewerName}</span>
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
              <p>Vous n'avez pas encore d'évaluations.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}


export default function ProfilePage() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Item[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]); // Reviews still mock for now
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        const profile = await getUserDocument(user.uid);
        setUserProfile(profile);
        if (profile) {
          const userListings = await getUserListingsFromFirestore(profile.uid);
          setListings(userListings);
          // Fetch reviews for this user (mock for now, replace with Firestore later)
          // const userReviews = await getMockReviewsForUser(profile.uid); 
          // setReviews(userReviews);
        }
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
        setListings([]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!firebaseUser || !userProfile) {
    return (
      <div className="text-center py-10">
        <Alert variant="default" className="max-w-md mx-auto">
          <LogIn className="h-4 w-4" />
          <AlertTitle>Veuillez vous connecter</AlertTitle>
          <AlertDescription>
            Vous devez être connecté pour voir votre profil.
            <Link href="/auth/signin" className="font-bold text-primary hover:underline ml-1">Se connecter</Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <UserProfileContent user={userProfile} listings={listings} reviews={reviews} />;
}
