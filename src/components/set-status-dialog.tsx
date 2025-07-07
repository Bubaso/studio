

"use client";

import { useState, useTransition, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PenSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Item } from '@/lib/types';
import { addUserStatus } from '@/services/userService';

interface SetStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated: () => void;
  userListings: Item[];
}

const MAX_STATUS_LENGTH = 150;

export function SetStatusDialog({ open, onOpenChange, onStatusUpdated, userListings }: SetStatusDialogProps) {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  
  const [text, setText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string>("none");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
        // Reset form when dialog opens
        setText("");
        setSelectedItemId("none");
    }
  }, [open]);


  const handleSave = () => {
    if (!firebaseUser) return;
    if (!text.trim()) {
        toast({ variant: 'destructive', title: "Le texte du statut est requis."});
        return;
    }
    startTransition(async () => {
      const result = await addUserStatus(firebaseUser.uid, text.trim(), selectedItemId === "none" ? null : selectedItemId);
      if (result.success) {
        toast({ title: "Statut ajouté !"});
        onStatusUpdated();
      } else {
        toast({ variant: 'destructive', title: "Erreur", description: result.error });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenSquare className="h-5 w-5" />
            Ajouter un nouveau statut
          </DialogTitle>
          <DialogDescription>
            Partagez ce que vous faites ou mettez en avant un de vos articles. Votre statut sera visible sur votre profil.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Textarea
                    placeholder="Quoi de neuf ?"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={MAX_STATUS_LENGTH}
                    className="h-24"
                    disabled={isPending}
                />
                <p className="text-xs text-muted-foreground text-right">
                    {text.length} / {MAX_STATUS_LENGTH}
                </p>
            </div>
            <div className="space-y-2">
                 <Select value={selectedItemId} onValueChange={setSelectedItemId} disabled={isPending}>
                    <SelectTrigger>
                        <SelectValue placeholder="Mettre en avant un article (Optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Ne pas mettre d'article en avant</SelectItem>
                        {userListings.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                                {item.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
        
        <DialogFooter className="mt-4 pt-4 border-t">
            <DialogClose asChild>
                <Button variant="ghost">Annuler</Button>
            </DialogClose>
            <Button
                onClick={handleSave}
                disabled={isPending || !text.trim()}
            >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer le statut
            </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
