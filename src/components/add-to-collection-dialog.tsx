
"use client";

import { useEffect, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { UserCollection } from '@/lib/types';
import {
  getCollectionsForUser,
  createCollectionAndAddItem,
  toggleItemInCollection,
  getCollectionsForItem
} from '@/services/favoriteService';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';

interface AddToCollectionDialogProps {
  itemId: string;
  open: boolean;
  onOpenChange: (wasUpdated: boolean) => void;
}

// Helper to compare two sets
const areSetsEqual = (a: Set<string>, b: Set<string>) => {
    if (a.size !== b.size) return false;
    for (const value of a) {
        if (!b.has(value)) return false;
    }
    return true;
}


export function AddToCollectionDialog({ itemId, open, onOpenChange }: AddToCollectionDialogProps) {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  
  const [collections, setCollections] = useState<UserCollection[]>([]);
  
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<string>>(new Set());
  const [draftSelectedIds, setDraftSelectedIds] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, startUpdateTransition] = useTransition();

  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  const fetchCollectionsData = async () => {
    if (!firebaseUser || !itemId) return;
    setIsLoading(true);
    try {
      const [userCollections, collectionsWithItem] = await Promise.all([
          getCollectionsForUser(firebaseUser.uid),
          getCollectionsForItem(firebaseUser.uid, itemId)
      ]);
      
      setCollections(userCollections);
      
      const initialIds = new Set(collectionsWithItem.map(c => c.id));
      setInitialSelectedIds(initialIds);
      setDraftSelectedIds(initialIds);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger vos collections.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && firebaseUser) {
      setShowNewCollectionInput(false);
      setNewCollectionName("");
      fetchCollectionsData();
    }
  }, [open, firebaseUser]);


  const handleCollectionToggle = (collectionId: string, checked: boolean) => {
    setDraftSelectedIds(prev => {
        const newSet = new Set(prev);
        if (checked) {
            newSet.add(collectionId);
        } else {
            newSet.delete(collectionId);
        }
        return newSet;
    });
  };
  
  const handleCreateCollection = () => {
    if (!firebaseUser || !newCollectionName.trim()) return;
    
    startUpdateTransition(async () => {
      const result = await createCollectionAndAddItem(firebaseUser.uid, newCollectionName, itemId);
      if (result.success) {
        toast({ title: 'Collection créée', description: `"${newCollectionName}" a été créée et l'article ajouté.` });
        setShowNewCollectionInput(false);
        setNewCollectionName("");
        await fetchCollectionsData();
      } else {
        toast({ variant: 'destructive', title: 'Erreur', description: result.error });
      }
    });
  };

  const handleSaveChanges = () => {
    if (!firebaseUser) return;

    startUpdateTransition(async () => {
        const idsToAdd = [...draftSelectedIds].filter(id => !initialSelectedIds.has(id));
        const idsToRemove = [...initialSelectedIds].filter(id => !draftSelectedIds.has(id));
        
        const promises: Promise<any>[] = [];

        idsToAdd.forEach(collectionId => {
            promises.push(toggleItemInCollection(firebaseUser.uid, collectionId, itemId, false));
        });

        idsToRemove.forEach(collectionId => {
            promises.push(toggleItemInCollection(firebaseUser.uid, collectionId, itemId, true));
        });
        
        try {
            await Promise.all(promises);
            toast({ title: "Collections mises à jour", description: "Vos favoris ont été sauvegardés." });
            onOpenChange(true); // Close dialog and trigger refresh
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: error.message || "Impossible de sauvegarder les modifications." });
        }
    });
  };

  const hasChanges = !areSetsEqual(initialSelectedIds, draftSelectedIds);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onOpenChange(false) }}>
      <DialogContent 
        className="sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>Sauvegarder dans...</DialogTitle>
          <DialogDescription>
            Cochez les collections où vous souhaitez sauvegarder cet article.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
            <div className="h-40 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
             <ScrollArea className="max-h-60 pr-4 -mr-4">
                 <div className="space-y-2 py-2">
                    {collections.map(collection => (
                        <div key={collection.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted">
                            <Checkbox 
                                id={`collection-${collection.id}`}
                                checked={draftSelectedIds.has(collection.id)}
                                onCheckedChange={(checked) => handleCollectionToggle(collection.id, !!checked)}
                                disabled={isUpdating}
                            />
                            <Label htmlFor={`collection-${collection.id}`} className="flex-1 cursor-pointer">
                                {collection.name}
                                <span className="text-xs text-muted-foreground ml-2">({collection.itemCount} articles)</span>
                            </Label>
                        </div>
                    ))}
                 </div>
             </ScrollArea>
        )}

        <div className="mt-4">
            {showNewCollectionInput ? (
                <div className="flex items-center gap-2">
                    <Input
                        value={newCollectionName}
                        onChange={(e) => setNewCollectionName(e.target.value)}
                        placeholder="Nom de la nouvelle collection"
                        disabled={isUpdating}
                    />
                    <Button onClick={handleCreateCollection} disabled={isUpdating || !newCollectionName.trim()}>
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
                    </Button>
                </div>
            ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowNewCollectionInput(true);
                  }}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Créer une nouvelle collection
                </Button>
            )}
        </div>
        
        <DialogFooter className="mt-4 pt-4 border-t">
            <DialogClose asChild>
                <Button variant="ghost">Annuler</Button>
            </DialogClose>
            <Button
                onClick={handleSaveChanges}
                disabled={!hasChanges || isUpdating}
            >
                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Enregistrer
            </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
