
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { markItemAsSold as markItemAsSoldService, deleteItem as deleteItemService } from '@/services/itemService';
import { auth } from '@/lib/firebase'; // Client SDK, Next.js provides auth context

export async function markAsSoldAction(itemId: string, sellerId: string) {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== sellerId) {
        return { success: false, error: "Non autorisé. Vous devez être le vendeur de cet article." };
    }
    try {
        await markItemAsSoldService(itemId);
        revalidatePath(`/items/${itemId}`);
        revalidatePath(`/profile/${sellerId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Error in markAsSoldAction: ", error);
        return { success: false, error: error.message || "Une erreur est survenue lors de la mise à jour de l'annonce." };
    }
}

export async function deleteItemAction(itemId: string, sellerId: string) {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== sellerId) {
        return { success: false, error: "Non autorisé. Vous devez être le vendeur de cet article." };
    }
    try {
        await deleteItemService(itemId);
    } catch (error: any) {
        console.error("Error in deleteItemAction: ", error);
        return { success: false, error: error.message || "Une erreur est survenue lors de la suppression de l'annonce." };
    }
    
    // On success, revalidate paths and redirect
    revalidatePath('/browse');
    revalidatePath(`/profile/${sellerId}`);
    redirect(`/profile/${sellerId}`);
}
