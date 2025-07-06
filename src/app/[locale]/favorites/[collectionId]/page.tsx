
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getCollectionWithItems, deleteCollection } from '@/services/favoriteService';
import type { UserCollection, Item } from '@/lib/types';
import { ItemCard } from '@/components/item-card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, FolderX, Trash } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslations } from 'next-intl';

export default function CollectionDetailPage() {
  const t = useTranslations('CollectionDetailPage');
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const collectionId = params.collectionId as string;
  const { firebaseUser: currentUser, authLoading } = useAuth();
  
  const [collection, setCollection] = useState<UserCollection | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
        router.push('/auth/signin?redirect=/favorites');
        return;
    }
    if (!collectionId) {
        setIsLoading(false);
        return;
    }

    const fetchCollectionData = async () => {
      setIsLoading(true);
      const data = await getCollectionWithItems(collectionId);
      
      if (data && data.collection.userId === currentUser.uid) {
        setCollection(data.collection);
        setItems(data.items);
      } else {
        toast({ variant: 'destructive', title: t('toast.error'), description: t('toast.notFound') });
      }
      setIsLoading(false);
    };

    fetchCollectionData();
  }, [collectionId, currentUser, authLoading, router, toast, t]);

  const handleDelete = async () => {
    if (!currentUser || !collection) return;
    setIsDeleting(true);
    const result = await deleteCollection(collection.id, currentUser.uid);
    if(result.success) {
        toast({ title: t('toast.deleted') });
        router.push('/favorites');
    } else {
        toast({ variant: 'destructive', title: t('toast.error'), description: result.error });
        setIsDeleting(false);
    }
  }


  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  if (!collection) {
    return (
       <Card className="max-w-xl mx-auto my-10">
            <CardHeader>
                <CardTitle className="text-destructive text-center">{t('notFound.title')}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">
                    {t('notFound.description')}
                </p>
                <Button variant="outline" asChild>
                    <Link href="/favorites">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t('notFound.button')}
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -ml-3">
                <Link href="/favorites">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t('backToCollections')}
                </Link>
            </Button>
            <h1 className="text-3xl font-bold font-headline text-primary">{collection.name}</h1>
            <p className="text-muted-foreground">{t('itemCount', { count: collection.itemCount })}</p>
        </div>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Trash className="mr-2 h-4 w-4" /> {t('deleteCollection.button')}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('deleteCollection.dialogTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('deleteCollection.dialogDescription', { name: collection.name })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t('deleteCollection.cancelButton')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t('deleteCollection.confirmButton')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg shadow-sm bg-card/50 p-6">
          <FolderX className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">{t('emptyCollection.title')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('emptyCollection.description')}
          </p>
          <Link href="/browse">
            <Button variant="secondary" size="lg">{t('emptyCollection.browseButton')}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
