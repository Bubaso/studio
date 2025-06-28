
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
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';
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

export function AddToCollectionDialog({ itemId, open, onOpenChange }: AddToCollectionDialogProps) {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, startUpdateTransition] = useTransition();

  const [showNewCollectionInput, setShowNewCollectionInput] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  const fetchCollectionsData = async () => {
    if (!firebaseUser || !itemId) return;
    setIsLoading(true);
    try {
      const userCollections = await getCollectionsForUser(firebaseUser.uid);
      setCollections(userCollections);
      
      const collectionsWithItem = await getCollectionsForItem(firebaseUser.uid, itemId);
      setSelectedCollectionIds(new Set(collectionsWithItem.map(c => c.id)));

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de charger vos collections.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open && firebaseUser) {
      fetchCollectionsData();
    } else {
      setShowNewCollectionInput(false);
      setNewCollectionName("");
    }
  }, [open, firebaseUser]);


  const handleCollectionToggle = (collectionId: string, checked: boolean) => {
    startUpdateTransition(async () => {
        if (!firebaseUser) return;
        
        const result = await toggleItemInCollection(firebaseUser.uid, collectionId, itemId, !checked);
        if(result.success) {
            setSelectedCollectionIds(prev => {
                const newSet = new Set(prev);
                if (checked) newSet.add(collectionId);
                else newSet.delete(collectionId);
                return newSet;
            })
        } else {
            toast({ variant: 'destructive', title: 'Erreur', description: result.error });
        }
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
        fetchCollectionsData(); // Refresh the list
      } else {
        toast({ variant: 'destructive', title: 'Erreur', description: result.error });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => onOpenChange(true)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sauvegarder dans...</DialogTitle>
          <DialogDescription>
            Choisissez une ou plusieurs collections où sauvegarder cet article.
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
                                checked={selectedCollectionIds.has(collection.id)}
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
        
      </DialogContent>
    </Dialog>
  );
}
