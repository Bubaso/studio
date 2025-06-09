
'use server';

import { auth } from '@/lib/firebase';
import { addReviewToFirestore, ReviewData, checkIfUserHasReviewedItem } from '@/services/reviewService';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const reviewSchema = z.object({
  itemId: z.string().min(1, "L'ID de l'article est requis."),
  sellerId: z.string().min(1, "L'ID du vendeur est requis."),
  rating: z.coerce.number().min(1, "La note doit être d'au moins 1.").max(5, "La note ne peut pas dépasser 5."),
  comment: z.string().min(10, "Le commentaire doit comporter au moins 10 caractères.").max(1000, "Le commentaire ne peut pas dépasser 1000 caractères."),
});

export interface SubmitReviewState {
  success?: boolean;
  message?: string;
  errors?: {
    itemId?: string[];
    sellerId?: string[];
    rating?: string[];
    comment?: string[];
    general?: string[];
  };
}

export async function submitReview(
  prevState: SubmitReviewState,
  formData: FormData
): Promise<SubmitReviewState> {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    return { errors: { general: ["Vous devez être connecté pour laisser un avis."] } };
  }

  const validatedFields = reviewSchema.safeParse({
    itemId: formData.get('itemId'),
    sellerId: formData.get('sellerId'),
    rating: formData.get('rating'),
    comment: formData.get('comment'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { itemId, sellerId, rating, comment } = validatedFields.data;

  if (currentUser.uid === sellerId) {
    return { errors: { general: ["Vous ne pouvez pas évaluer votre propre article."] } };
  }

  try {
    const alreadyReviewed = await checkIfUserHasReviewedItem(currentUser.uid, itemId);
    if (alreadyReviewed) {
      return { errors: { general: ["Vous avez déjà laissé un avis pour cet article."] } };
    }

    const reviewData: ReviewData = {
      itemId,
      sellerId,
      rating,
      comment,
      reviewerId: currentUser.uid,
      reviewerName: currentUser.displayName || currentUser.email || 'Utilisateur Anonyme',
      reviewerAvatarUrl: currentUser.photoURL,
    };

    await addReviewToFirestore(reviewData);
    revalidatePath(`/items/${itemId}`);
    return { success: true, message: 'Avis soumis avec succès !' };
  } catch (error: any) {
    console.error('Error submitting review action:', error);
    return { errors: { general: [error.message || "Une erreur s'est produite lors de la soumission de l'avis."] } };
  }
}
