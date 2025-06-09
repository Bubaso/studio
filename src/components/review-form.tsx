
"use client";

import { useEffect, useState, startTransition, useRef } from 'react'; // Added useRef
import { useActionState } from 'react'; // React 19
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, Loader2, Send, Info, LogIn } from 'lucide-react';
import { submitReview, type SubmitReviewState } from '@/actions/reviewActions';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const reviewFormSchema = z.object({
  rating: z.coerce.number().min(1, "Note requise").max(5, "Maximum 5 étoiles"),
  comment: z.string().min(10, "Le commentaire doit faire au moins 10 caractères.").max(1000, "Commentaire trop long"),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

interface ReviewFormProps {
  itemId: string;
  sellerId: string;
  hasUserAlreadyReviewed: boolean;
}

const initialState: SubmitReviewState = {};

export function ReviewForm({ itemId, sellerId, hasUserAlreadyReviewed }: ReviewFormProps) {
  const { toast } = useToast();
  const [state, formAction, isPending] = useActionState(submitReview, initialState);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (state?.success) {
      toast({
        title: 'Avis soumis !',
        description: state.message || 'Votre avis a été enregistré.',
      });
      form.reset(); 
    } else if (state?.errors?.general) {
      toast({
        variant: "destructive",
        title: 'Erreur',
        description: state.errors.general.join(', '),
      });
    } else if (state?.errors) {
        const fieldErrorMessages = Object.values(state.errors).flat().join(' ');
        if (fieldErrorMessages) {
            toast({
                variant: "destructive",
                title: 'Erreur de validation',
                description: fieldErrorMessages || "Veuillez corriger les erreurs dans le formulaire.",
            });
        }
    }
  }, [state, toast, form]);
  
  const handleFormSubmitAttempt = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission initially
    const isValid = await form.trigger(); // Trigger RHF validation
    if (isValid && formRef.current) {
      // If RHF validation passes, programmatically submit the HTML form.
      // This will invoke the `formAction` passed to the form's `action` prop.
      // React should handle `isPending` and transitions correctly via this path.
      formRef.current.requestSubmit();
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Chargement du formulaire d'avis...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Connectez-vous pour laisser un avis</AlertTitle>
        <AlertDescription>
          Veuillez <Link href={`/auth/signin?redirect=/items/${itemId}`} className="font-semibold text-primary hover:underline">vous connecter</Link> pour évaluer cet article.
        </AlertDescription>
      </Alert>
    );
  }

  if (currentUser.uid === sellerId) {
    return (
      <Alert variant="default" className="bg-secondary/30">
        <Info className="h-4 w-4" />
        <AlertTitle>Vous êtes le vendeur</AlertTitle>
        <AlertDescription>Vous ne pouvez pas laisser d'avis sur votre propre article.</AlertDescription>
      </Alert>
    );
  }
  
  if (hasUserAlreadyReviewed && !state?.success) { 
     return (
      <Alert variant="default" className="bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
        <Info className="h-4 w-4" />
        <AlertTitle>Avis déjà soumis</AlertTitle>
        <AlertDescription>Vous avez déjà laissé un avis pour cet article.</AlertDescription>
      </Alert>
    );
  }
  
  if (state?.success) { 
     return (
      <Alert variant="default" className="bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
        <Info className="h-4 w-4" />
        <AlertTitle>Merci pour votre avis !</AlertTitle>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}> {/* RHF Provider */}
      <form
        ref={formRef}
        action={formAction} // Pass the action from useActionState here
        onSubmit={handleFormSubmitAttempt} // RHF validation triggered here
        className="space-y-6 p-6 border rounded-lg shadow-sm bg-card"
      >
        {/* Hidden fields are automatically included in FormData by the browser if they have `name` attributes */}
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="sellerId" value={sellerId} />
        
        <FormField
          control={form.control}
          name="rating" // This name is for RHF
          render={({ field }) => (
            <FormItem>
              <FormLabel>Votre note (sur 5)</FormLabel>
              {/* The Select component itself doesn't submit its value directly with FormData.
                  We need a hidden input that RHF controls, or handle it in the action.
                  For `action` prop to work, it must be in FormData.
              */}
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value))} 
                defaultValue={field.value?.toString() || "0"}
                name="rating" // This name is for the actual form submission
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisissez une note..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      <div className="flex items-center">
                        {Array(num).fill(0).map((_, i) => <Star key={`filled-${i}`} className="h-4 w-4 text-yellow-400 fill-yellow-400 mr-1" />)}
                        {Array(5-num).fill(0).map((_, i) => <Star key={`empty-${i}`} className="h-4 w-4 text-muted-foreground/50 mr-1" />)}
                        <span className="ml-2">({num})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* 
                If ShadCN's Select doesn't render a native select with a name,
                we need a hidden input synced by RHF to ensure 'rating' is in FormData.
                The 'name="rating"' on Select might not be picked up by all browsers for FormData.
                A hidden input is safer for FormData construction.
              */}
              <input type="hidden" {...form.register("rating")} />
              {state?.errors?.rating && <FormMessage>{state.errors.rating.join(', ')}</FormMessage>}
              <FormMessage /> 
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comment" // This name is for RHF and will be used for FormData
          render={({ field }) => (
            <FormItem>
              <FormLabel>Votre commentaire</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Partagez votre expérience avec cet article et le vendeur..."
                  rows={4}
                  {...field} // This spreads name="comment", value, onChange etc.
                />
              </FormControl>
               {state?.errors?.comment && <FormMessage>{state.errors.comment.join(', ')}</FormMessage>}
              <FormMessage />
            </FormItem>
          )}
        />
        
        {state?.errors?.general && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{state.errors.general.join(', ')}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {isPending ? 'Envoi en cours...' : 'Soumettre mon avis'}
        </Button>
      </form>
    </Form>
  );
}

