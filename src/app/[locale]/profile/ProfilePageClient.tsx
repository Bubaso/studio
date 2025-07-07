
"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import type { UserProfile, Item, Review } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ItemCard } from '@/components/item-card';
import { Edit3, MapPin, CalendarDays, Star, LogIn, Loader2, Trash2, LayoutDashboard, PenSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteUserAccount, getSubscribersForUser, getSubscriptionsForUser } from '@/services/userService';
import { SubscriptionListDialog } from '@/components/subscription-list-dialog';
import { SetStatusDialog } from '@/components/set-status-dialog';
import { StatusDisplay } from '@/components/status-display';

export default function ProfilePageClient() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { userProfile, listings, isLoading: isProfileLoading, refetch: refetchProfile } = useUserProfile(firebaseUser?.uid || null);
  
  const [subscribers, setSubscribers] = useState<UserProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserProfile[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(true);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (firebaseUser) {
        setIsLoadingSubs(true);
        Promise.all([
            getSubscribersForUser(firebaseUser.uid),
            getSubscriptionsForUser(firebaseUser.uid)
        ]).then(([subs, scrips]) => {
            setSubscribers(subs);
            setSubscriptions(scrips);
        }).finally(() => {
            setIsLoadingSubs(false);
        });
    } else if(!isAuthLoading) {
        setIsLoadingSubs(false);
    }
  }, [firebaseUser, isAuthLoading]);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const result = await deleteUserAccount();
    if(result.success) {
      toast({
        title: "Compte supprimé",
        description: "Votre compte a été supprimé. Vous êtes déconnecté.",
      });
      // The backend has deleted the user. Signing out clears the client state.
      await signOut(auth);
      router.push('/');
      router.refresh(); // Force a full reload to clear all state
    } else {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: result.error || "Impossible de supprimer le compte.",
      });
      setIsDeleting(false);
    }
  };

  const handleStatusUpdate = () => {
    setIsStatusDialogOpen(false);
    refetchProfile(); // Re-fetch profile to show the new status
  };

  const isLoading = isAuthLoading || isProfileLoading || isLoadingSubs;

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

  return (
    <div className="space-y-8">
       <SetStatusDialog 
        open={isStatusDialogOpen} 
        onOpenChange={setIsStatusDialogOpen}
        onStatusUpdated={handleStatusUpdate}
        currentStatus={userProfile.status}
        userListings={listings.filter(l => !l.isSold)}
      />

      {userProfile.status && <StatusDisplay user={userProfile} status={userProfile.status} />}

      <Card className="shadow-lg">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-primary">
            <AvatarImage src={userProfile.avatarUrl || undefined} alt={userProfile.name || 'User'} data-ai-hint={userProfile.dataAiHint} />
            <AvatarFallback className="text-4xl">{(userProfile.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary mb-2">{userProfile.name || 'Utilisateur'}</h1>
            
            <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-2 text-sm space-x-4">
                <SubscriptionListDialog
                    title="Abonnés"
                    users={subscribers}
                    trigger={
                        <button className="hover:text-primary transition-colors">
                            <strong>{userProfile.subscriberCount || 0}</strong> Abonnés
                        </button>
                    }
                />
                <SubscriptionListDialog
                    title="Abonnements"
                    users={subscriptions}
                    trigger={
                        <button className="hover:text-primary transition-colors">
                              <strong>{userProfile.subscriptionCount || 0}</strong> Abonnements
                        </button>
                    }
                />
            </div>

            {userProfile.location && (
              <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-1">
                <MapPin className="h-4 w-4 mr-2" /> {userProfile.location}
              </div>
            )}
            <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-4">
              <CalendarDays className="h-4 w-4 mr-2" /> Inscrit(e) le {new Date(userProfile.joinedDate).toLocaleDateString('fr-FR')}
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(true)}>
                <PenSquare className="mr-2 h-4 w-4" />
                Définir le statut
              </Button>
              <Link href="/profile/edit">
                <Button variant="outline">
                  <Edit3 className="mr-2 h-4 w-4" /> Modifier le profil
                </Button>
              </Link>
               <Link href="/dashboard">
                <Button>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Gérer mes annonces
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">Mes annonces ({listings.length})</h2>
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 gap-6"> {/* Updated grid classes */}
            {listings.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>Vous n'avez pas encore mis d'articles en vente.</p>
              <Link href="/sell" className="mt-4 inline-block">
                <Button variant="secondary">Publiez votre premier article !</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">Mes évaluations ({[]?.length || 0})</h2>
        {[]?.length > 0 ? (
          <div className="space-y-4">
            {/* Reviews mapping would go here */}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>Vous n'avez pas encore d'évaluations.</p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Zone de Danger</CardTitle>
          <CardDescription>
            Cette action est permanente et ne peut pas être annulée.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer mon compte définitivement
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Êtes-vous absolument sûr(e) ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action ne peut pas être annulée. Votre compte, vos annonces, vos images et toutes vos données associées seront définitivement supprimés.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Oui, supprimer mon compte
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
