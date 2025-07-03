
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


export default function CollectionDetailPage() {
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
        toast({ variant: 'destructive', title: 'Erreur', description: 'Collection non trouvée ou accès non autorisé.' });
      }
      setIsLoading(false);
    };

    fetchCollectionData();
  }, [collectionId, currentUser, authLoading, router, toast]);

  const handleDelete = async () => {
    if (!currentUser || !collection) return;
    setIsDeleting(true);
    const result = await deleteCollection(collection.id, currentUser.uid);
    if(result.success) {
        toast({ title: 'Collection supprimée' });
        router.push('/favorites');
    } else {
        toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        setIsDeleting(false);
    }
  }


  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Chargement de la collection...</p>
      </div>
    );
  }

  if (!collection) {
    return (
       <Card className="max-w-xl mx-auto my-10">
            <CardHeader>
                <CardTitle className="text-destructive text-center">Collection non trouvée</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-muted-foreground mb-4">
                    La collection que vous cherchez n'existe pas ou vous n'avez pas la permission de la voir.
                </p>
                <Button variant="outline" asChild>
                    <Link href="/favorites">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Retour à mes collections
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
                    Toutes les collections
                </Link>
            </Button>
            <h1 className="text-3xl font-bold font-headline text-primary">{collection.name}</h1>
            <p className="text-muted-foreground">{collection.itemCount} article{collection.itemCount !== 1 ? 's' : ''}</p>
        </div>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Trash className="mr-2 h-4 w-4" /> Supprimer la collection
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Cette action est irréversible. La collection "{collection.name}" sera définitivement supprimée. Les articles qu'elle contient ne seront pas supprimés de la plateforme.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Oui, supprimer
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
          <h2 className="text-2xl font-semibold mb-2">Cette collection est vide</h2>
          <p className="text-muted-foreground mb-6">
            Parcourez les articles et cliquez sur le ❤️ pour les ajouter à cette collection.
          </p>
          <Link href="/browse">
            <Button variant="secondary" size="lg">Explorer les articles</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
