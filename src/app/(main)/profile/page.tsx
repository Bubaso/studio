import { getMockCurrentUser, getMockUserListings } from '@/lib/mock-data';
import type { User, Item, Review } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ItemCard } from '@/components/item-card';
import { Edit3, MapPin, CalendarDays, Star, Mail, Info, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

async function UserProfileContent({ user }: { user: User }) {
  const listings = await getMockUserListings(user.id);
  // Mock reviews for current user's profile are attached in getMockUserById, used here if user.reviews is populated
  const reviews = user.reviews || [];

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
              <CalendarDays className="h-4 w-4 mr-2" /> Joined on {new Date(user.joinedDate).toLocaleDateString()}
            </div>
            {user.ratings && (
              <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-4">
                <Star className="h-5 w-5 mr-1 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">{user.ratings.value.toFixed(1)}</span>
                <span className="ml-1">({user.ratings.count} ratings)</span>
              </div>
            )}
            <Button variant="outline">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">My Listings ({listings.length})</h2>
        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>You haven't listed any items yet.</p>
              <Link href="/sell">
                <Button variant="link" className="mt-2 text-primary">List an Item</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">My Reviews ({reviews.length})</h2>
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
                  <p className="text-xs text-muted-foreground/80">{new Date(review.date).toLocaleDateString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>You have no reviews yet.</p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}


export default async function ProfilePage() {
  const currentUser = await getMockCurrentUser();

  if (!currentUser) {
    return (
      <div className="text-center py-10">
        <Alert variant="default" className="max-w-md mx-auto">
          <LogIn className="h-4 w-4" />
          <AlertTitle>Please Sign In</AlertTitle>
          <AlertDescription>
            You need to be signed in to view your profile. 
            <Link href="/auth/signin" className="font-bold text-primary hover:underline ml-1">Sign In</Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <UserProfileContent user={currentUser} />;
}
