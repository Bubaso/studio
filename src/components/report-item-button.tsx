
"use client";

import { useEffect, useState, useTransition } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Flag, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { reportItemAsSold, hasUserReportedItem } from '@/services/reportService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ReportItemButtonProps {
  itemId: string;
  sellerId: string;
  asIcon?: boolean;
}

export function ReportItemButton({ itemId, sellerId, asIcon = false }: ReportItemButtonProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasReported, setHasReported] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        hasUserReportedItem(itemId, user.uid).then(reported => {
          setHasReported(reported);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [itemId]);

  const handleReport = () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Connexion requise",
        description: "Vous devez être connecté pour signaler un article.",
      });
      return;
    }

    startTransition(async () => {
      const result = await reportItemAsSold(itemId, currentUser.uid);
      if (result.success) {
        toast({
          title: "Article signalé",
          description: "Merci pour votre contribution ! Nous allons examiner ce signalement.",
        });
        setHasReported(true);
        if (result.triggeredSuspectedSold) {
          // Refresh the page to show the new badge
          window.location.reload(); 
        }
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error || "Impossible de signaler l'article.",
        });
      }
    });
  };

  if (isLoading) {
    return (
        <Button variant="outline" size={asIcon ? "icon" : "sm"} disabled className="text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
        </Button>
    );
  }
  
  if (!currentUser || currentUser.uid === sellerId) {
      return null; // Don't show if not logged in or if current user is the seller
  }

  if (hasReported) {
    const buttonContent = (
      <Button variant="outline" size={asIcon ? "icon" : "sm"} disabled className="text-green-600 border-green-600">
        <CheckCircle className="h-4 w-4" />
        {!asIcon && <span className="ml-2">Signalé</span>}
      </Button>
    );
    return asIcon ? (
       <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent><p>Vous avez déjà signalé cet article.</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : buttonContent;
  }

  const buttonContent = (
      <Button variant="outline" size={asIcon ? "icon" : "sm"} onClick={handleReport} disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
        {!asIcon && <span className="ml-2">Article déjà vendu ?</span>}
      </Button>
  );
  
  return asIcon ? (
     <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent><p>Signaler comme potentiellement vendu</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : buttonContent;
}
