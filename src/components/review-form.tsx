
"use client";

import { useEffect, useState, startTransition, useRef } from 'react';
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
  // formRef is no longer needed with RHF's handleSubmit
  // const formRef = useRef<HTMLFormElement>(null); 

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 0, // Default to 0, validation will catch if not changed
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
      form.reset({ rating: 0, comment: '' });
    } else if (state?.errors) {
      const generalError = state.errors.general?.join(', ');
      const fieldErrorMessages = Object.entries(state.errors)
        .filter(([key]) => key !== 'general')
        .map(([, value]) => value?.join(', '))
        .filter(Boolean)
        .join(' \n');

      if (generalError) {
        toast({
          variant: "destructive",
          title: 'Erreur de soumission',
          description: generalError,
        });
      }
      // Only toast field errors if there's no general error, to avoid redundancy with FormMessage
      else if (fieldErrorMessages && !generalError) {
         toast({
          variant: "destructive",
          title: 'Erreur de validation du serveur',
          description: fieldErrorMessages,
        });
      }
    }
  }, [state, toast, form]);
  
  const onValidSubmit = (data: ReviewFormValues) => {
    const formData = new FormData();
    formData.append('itemId', itemId);
    formData.append('sellerId', sellerId);
    // data.rating is already a number due to RHF schema coercion and Select's parseInt
    formData.append('rating', data.rating.toString());
    formData.append('comment', data.comment);

    startTransition(() => {
      formAction(formData);
    });
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
        onSubmit={form.handleSubmit(onValidSubmit)} // Use RHF's handleSubmit
        className="space-y-6 p-6 border rounded-lg shadow-sm bg-card"
      >
        {/* Hidden fields are not needed here as itemId and sellerId are passed directly when constructing FormData */}
        
        <FormField
          control={form.control}
          name="rating" 
          render={({ field }) => (
            <FormItem>
              <FormLabel>Votre note (sur 5)</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                value={field.value?.toString() || "0"} // Ensure value is a string for Select
                // name="rating" // Not needed for FormData when using RHF's handleSubmit
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisissez une note..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0" disabled>Choisissez une note...</SelectItem>
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
              {/* No hidden input needed here as RHF handles the value */}
              <FormMessage /> {/* RHF will display "Note requise" if rating is 0 */}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Votre commentaire</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Partagez votre expérience avec cet article et le vendeur..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {state?.errors?.general && ( // Display general errors from server action
          <Alert variant="destructive" className="mt-4">
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
