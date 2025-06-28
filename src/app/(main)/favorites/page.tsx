"use client";

import { useAuth } from '@/context/AuthContext';
import { getCollectionsForUser, createEmptyCollection } from '@/services/favoriteService';
import type { UserCollection } from '@/lib/types';
import { Loader2, FolderPlus, LogIn, Info, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useEffect, useState } from 'react';
import { CollectionCard } from '@/components/collection-card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function FavoritesPage() {
  const { firebaseUser: currentUser, authLoading: isLoadingAuth } = useAuth();
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchCollections = async () => {
    if (!currentUser) return;
    setIsLoadingCollections(true);
    try {
      const userCollections = await getCollectionsForUser(currentUser.uid);
      setCollections(userCollections);
    } catch (error) {
      console.error("Failed to fetch collections:", error);
    } finally {
      setIsLoadingCollections(false);
    }
  };

  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
      fetchCollections();
    } else if (!isLoadingAuth) {
      setIsLoadingCollections(false);
    }
  }, [currentUser, isLoadingAuth]);

  const handleCreateCollection = async () => {
      if (!currentUser || !newCollectionName.trim()) {
          toast({ variant: "destructive", title: "Nom de la collection requis."});
          return;
      };
      setIsCreating(true);
      try {
          const result = await createEmptyCollection(currentUser.uid, newCollectionName);
          if (result.success) {
            toast({ title: "Collection créée !", description: `"${newCollectionName}" a été ajoutée.`});
            setNewCollectionName("");
            setIsDialogOpen(false);
            fetchCollections(); // Refresh the list
          } else {
              throw new Error(result.error || "Could not create collection.");
          }
      } catch(error: any) {
          toast({ variant: "destructive", title: "Erreur", description: error.message || "Impossible de créer la collection."});
      } finally {
          setIsCreating(false);
      }
  }


  if (isLoadingAuth || isLoadingCollections) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Chargement de vos collections...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <Alert className="max-w-md">
          <LogIn className="h-4 w-4" />
          <AlertTitle>Connexion requise</AlertTitle>
          <AlertDescription>
            Pour voir et gérer vos collections, veuillez vous connecter.
          </AlertDescription>
        </Alert>
        <Link href="/auth/signin?redirect=/favorites" className="mt-6">
          <Button>
            <LogIn className="mr-2 h-4 w-4" /> Se connecter
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline text-primary">Mes Collections</h1>
         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nouvelle Collection
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle collection</DialogTitle>
              <DialogDescription>
                Donnez un nom à votre nouvelle collection pour commencer à y sauvegarder des articles.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Nom
                </Label>
                <Input
                  id="name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="col-span-3"
                  placeholder="ex: Idées de salon"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost">Annuler</Button></DialogClose>
              <Button type="submit" onClick={handleCreateCollection} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {collections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg shadow-sm bg-card/50 p-6">
          <FolderPlus className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Aucune collection pour le moment</h2>
          <p className="text-muted-foreground mb-6">
            Créez votre première collection pour organiser les articles que vous aimez.
          </p>
        </div>
      )}
    </div>
  );
}
