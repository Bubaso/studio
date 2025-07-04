"use client";

import { useState, useEffect } from 'react';
import type { Item } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { getUserListingsFromFirestore } from '@/services/itemService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardListingCard } from '@/components/dashboard-listing-card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, LogIn, PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function ListingsDashboard() {
  const t = useTranslations('Dashboard');
  const { firebaseUser, authLoading } = useAuth();
  const [listings, setListings] = useState<Item[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (firebaseUser) {
      setIsLoadingListings(true);
      getUserListingsFromFirestore(firebaseUser.uid)
        .then(setListings)
        .finally(() => setIsLoadingListings(false));
    } else {
      setIsLoadingListings(false);
    }
  }, [firebaseUser, authLoading]);

  const activeListings = listings.filter(item => !item.isSold);
  const soldListings = listings.filter(item => item.isSold);

  if (authLoading || isLoadingListings) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">{t('loadingListings')}</p>
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <Alert>
        <LogIn className="h-4 w-4" />
        <AlertTitle>{t('loginRequiredTitle')}</AlertTitle>
        <AlertDescription>
          {t.rich('loginRequiredDesc', {
            loginLink: (chunks) => <Link href="/auth/signin?redirect=/dashboard" className="font-bold text-primary hover:underline">{chunks}</Link>
          })}
        </AlertDescription>
      </Alert>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-10 border-2 border-dashed rounded-lg shadow-sm bg-card/50 p-6 flex flex-col items-center">
        <PackageOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{t('noListingsTitle')}</h2>
        <p className="text-muted-foreground mb-6">{t('noListingsDesc')}</p>
        <Button asChild>
          <Link href="/sell">{t('createFirstListing')}</Link>
        </Button>
      </div>
    );
  }

  return (
    <Tabs defaultValue="active" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="active">{t('activeTab')} ({activeListings.length})</TabsTrigger>
        <TabsTrigger value="sold">{t('soldTab')} ({soldListings.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="active" className="mt-6">
        <div className="space-y-4">
          {activeListings.length > 0 ? (
            activeListings.map(item => <DashboardListingCard key={item.id} item={item} />)
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('noActiveListings')}</p>
          )}
        </div>
      </TabsContent>
      <TabsContent value="sold" className="mt-6">
        <div className="space-y-4">
          {soldListings.length > 0 ? (
            soldListings.map(item => <DashboardListingCard key={item.id} item={item} />)
          ) : (
            <p className="text-center text-muted-foreground py-8">{t('noSoldListings')}</p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
