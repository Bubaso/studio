
import { getUserDocument } from '@/services/userService';
import { getUserListingsFromFirestore } from '@/services/itemService';
import type { UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ItemCard } from '@/components/item-card';
import { MapPin, CalendarDays, MessageSquare } from 'lucide-react';
import { auth } from '@/lib/firebase'; // For current user
import { createOrGetThreadAndRedirect } from '@/actions/messageActions'; // Server Action

interface UserProfilePageProps {
  params: { userId: string };
}

// Helper component for the contact button
function ContactUserButton({ targetUserId, currentUserId }: { targetUserId: string; currentUserId: string | null }) {
  if (!currentUserId || currentUserId === targetUserId) {
    return null; // Don't show button if not logged in or if it's the user's own profile
  }

  return (
    <form action={async () => {
      if (currentUserId) {
         await createOrGetThreadAndRedirect(currentUserId, targetUserId);
      }
    }}>
      <Button type="submit" variant="outline">
        <MessageSquare className="mr-2 h-4 w-4" /> Contacter
      </Button>
    </form>
  );
}


export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const user = await getUserDocument(params.userId);
  const currentUser = auth.currentUser; // This will be null on server, auth state is client-side

  if (!user) {
    return <div className="text-center py-10">Utilisateur non trouvé. Vérifiez que l'UID est correct et que l'utilisateur existe dans Firestore.</div>;
  }

  const listings = await getUserListingsFromFirestore(user.uid);

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
            <ContactUserButton targetUserId={user.uid} currentUserId={currentUser?.uid || null} />
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">Annonces de {user.name ? user.name.split(' ')[0] : 'cet utilisateur'} ({listings.length})</h2>
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 gap-6"> {/* Updated grid classes */}
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
    </div>
  );
}
