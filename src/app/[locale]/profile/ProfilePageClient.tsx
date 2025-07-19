
"use client";

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { auth } from '@/lib/firebase';
import { signOut, type User as FirebaseUser } from 'firebase/auth';
import type { UserProfile, Item, Review, UserStatus } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ItemCard } from '@/components/item-card';
import { Edit3, MapPin, CalendarDays, Star, LogIn, Loader2, Trash2, LayoutDashboard, PenSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { deleteUserAccount } from '@/services/userService';
import { SubscriptionListDialog } from '@/components/subscription-list-dialog';
import { SetStatusDialog } from '@/components/set-status-dialog';
import { StatusDisplay } from '@/components/status-display';
import { useAuth } from '@/context/AuthContext';


interface ProfilePageClientProps {
  initialData: {
    userProfile: UserProfile | null;
    listings: Item[];
    subscriptions: UserProfile[];
    subscribers: UserProfile[];
    statuses: UserStatus[];
  } | null;
}

export default function ProfilePageClient({ initialData }: ProfilePageClientProps) {
  const t = useTranslations('ProfilePage');
  const locale = useLocale();
  const { firebaseUser, authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  // Initialize state from server-provided props
  const [statuses, setStatuses] = useState<UserStatus[]>(initialData?.statuses || []);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const result = await deleteUserAccount();
    if (result.success) {
      toast({
        title: t('toast.accountDeletedTitle'),
        description: t('toast.accountDeletedDesc'),
      });
      await signOut(auth);
      router.push(`/${locale}`);
      router.refresh();
    } else {
      toast({
        variant: "destructive",
        title: t('toast.errorTitle'),
        description: result.error || t('toast.deleteAccountError'),
      });
      setIsDeleting(false);
    }
  };
  
  // This function is no longer needed as we fetch data once on the server.
  // We can add it back if we need client-side refetching.
  const handleStatusUpdate = () => {
    setIsStatusDialogOpen(false);
    // Instead of a full refetch, we could optimistically update the state
    // or simply reload the page for now.
    router.refresh(); 
  };

  const handleStatusDeleted = (deletedStatusId: string) => {
    setStatuses(prev => prev.filter(s => s.id !== deletedStatusId));
  };

  if (authLoading) {
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!firebaseUser || !initialData?.userProfile) {
    return (
      <div className="text-center py-10">
        <Alert variant="default" className="max-w-md mx-auto">
          <LogIn className="h-4 w-4" />
          <AlertTitle>{t('loginRequiredTitle')}</AlertTitle>
          <AlertDescription>
            {t('loginRequiredDesc')}
            <Link href="/auth/signin" className="font-bold text-primary hover:underline ml-1">{t('signInLink')}</Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { userProfile, listings, subscribers, subscriptions } = initialData;

  return (
    <div className="space-y-8">
      <SetStatusDialog
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
        onStatusUpdated={handleStatusUpdate}
        userListings={listings.filter(l => !l.isSold)}
      />

      {statuses.length > 0 && (
        <div className="space-y-4">
          {statuses.map(status => (
            <StatusDisplay
              key={status.id}
              user={userProfile}
              status={status}
              onStatusDeleted={handleStatusDeleted}
            />
          ))}
        </div>
      )}

      <Card className="shadow-lg">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
          <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-primary">
            <AvatarImage src={userProfile.avatarUrl || undefined} alt={userProfile.name || 'User'} data-ai-hint={userProfile.dataAiHint} />
            <AvatarFallback className="text-4xl">{(userProfile.name || 'U').substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center md:text-left w-full">
            <h1 className="text-2xl md:text-3xl font-bold font-headline text-primary mb-2">{userProfile.name || t('user')}</h1>

            <div className="flex items-center justify-center md:justify-start text-muted-foreground mb-2 text-sm space-x-4">
              <SubscriptionListDialog
                title={t('subscribers')}
                users={subscribers}
                trigger={
                  <button className="hover:text-primary transition-colors">
                    <strong>{userProfile.subscriberCount || 0}</strong> {t('subscribers')}
                  </button>
                }
              />
              <SubscriptionListDialog
                title={t('subscriptions')}
                users={subscriptions}
                trigger={
                  <button className="hover:text-primary transition-colors">
                    <strong>{userProfile.subscriptionCount || 0}</strong> {t('subscriptions')}
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
              <CalendarDays className="h-4 w-4 mr-2" /> {t('joinedOn', { date: new Date(userProfile.joinedDate) })}
            </div>

            <div className="mt-4 flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-col">
              <Button variant="outline" onClick={() => setIsStatusDialogOpen(true)} className="w-full">
                <PenSquare className="mr-2 h-4 w-4" />
                {t('addStatus')}
              </Button>
              <div className="flex w-full gap-2">
                <Link href="/profile/edit" className="w-1/2">
                  <Button variant="outline" className="w-full">
                    <Edit3 className="mr-2 h-4 w-4" /> {t('edit')}
                  </Button>
                </Link>
                <Link href="/dashboard" className="w-1/2">
                  <Button className="w-full">
                    <LayoutDashboard className="mr-2 h-4 w-4" /> {t('dashboard')}
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">{t('myListings', { count: listings.length })}</h2>
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {listings.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>{t('noListings')}</p>
              <Link href="/sell" className="mt-4 inline-block">
                <Button variant="secondary">{t('postFirstItem')}</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold font-headline mb-4">{t('myReviews', { count: 0 })}</h2>
        {/* Review functionality can be added here */}
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>{t('noReviews')}</p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">{t('dangerZone')}</CardTitle>
          <CardDescription>
            {t('dangerZoneDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                {t('deleteAccount')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('confirmDeleteDesc')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                  {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('confirmDeleteButton')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
