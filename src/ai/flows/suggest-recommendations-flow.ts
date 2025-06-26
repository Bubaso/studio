
'use server';
/**
 * @fileOverview An AI agent that provides personalized item recommendations.
 *
 * - getPersonalizedRecommendations: A function to get a list of recommended items for a user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getUserViewHistory, getUserDocument } from '@/services/userService';
import { getItemByIdFromFirestore, getItemsFromFirestore } from '@/services/itemService';
import { getAuth } from "firebase-admin/auth";
import admin from '@/lib/firebaseAdmin'; 
import type { Item, ViewHistoryItem } from '@/lib/types';


// Define Zod schemas for the flow's input and output
const SuggestRecommendationsInputSchema = z.object({
  history: z.array(z.object({
    name: z.string(),
    category: z.string(),
    description: z.string().optional(),
  })).describe('The user\'s recent browsing history.'),
  candidates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    description: z.string().optional(),
  })).describe('A list of available items to recommend from.'),
});
type SuggestRecommendationsInput = z.infer<typeof SuggestRecommendationsInputSchema>;

const SuggestRecommendationsOutputSchema = z.object({
  recommendedItemIds: z.array(z.string()).describe('An array of item IDs that are the best match for the user.'),
  reasoning: z.string().optional().describe('A brief explanation for why these items were recommended.'),
});
type SuggestRecommendationsOutput = z.infer<typeof SuggestRecommendationsOutputSchema>;


const recommendationPrompt = ai.definePrompt({
    name: 'recommendationPrompt',
    input: { schema: SuggestRecommendationsInputSchema },
    output: { schema: SuggestRecommendationsOutputSchema },
    prompt: `You are an expert personal shopper for a West African secondhand marketplace.
    
    A user has recently viewed the following items:
    {{#each history}}
    - Name: {{name}}, Category: {{category}}, Description: {{description}}
    {{/each}}

    Based on this history, analyze the user's tastes (preferred categories, brands, styles, price points).
    
    Here is a catalog of currently available items (candidates):
    {{#each candidates}}
    - ID: {{id}}, Name: {{name}}, Category: {{category}}, Description: {{description}}
    {{/each}}

    Your task is to select up to 8 items from the candidates that would be a perfect recommendation for this user.
    - Prioritize items that are in similar categories to the user's history.
    - Look for items with similar keywords or styles.
    - Do NOT recommend items the user has already viewed.
    - Return ONLY the IDs of the recommended items.
    `,
});

const suggestRecommendationsFlow = ai.defineFlow(
  {
    name: 'suggestRecommendationsFlow',
    inputSchema: SuggestRecommendationsInputSchema,
    outputSchema: SuggestRecommendationsOutputSchema,
  },
  async (input) => {
    // If there is no history or no candidates, we can't make a recommendation.
    if (input.history.length === 0 || input.candidates.length === 0) {
      return { recommendedItemIds: [] };
    }
    
    const { output } = await recommendationPrompt(input);
    return output || { recommendedItemIds: [] };
  }
);


/**
 * Fetches personalized recommendations for a given user.
 * It retrieves the user's view history, gets a list of candidate items,
 * and then uses an AI flow to get a list of recommended item IDs,
 * which are then fetched in full.
 *
 * @param userId The UID of the user to get recommendations for.
 * @returns A promise that resolves to an array of recommended Item objects.
 */
export async function getPersonalizedRecommendations(userId: string): Promise<Item[]> {
  if (!userId) {
    console.log('No user ID provided for recommendations.');
    return [];
  }
  
  try {
    const [history, { items: candidates }] = await Promise.all([
      getUserViewHistory(userId, 10), // Get last 10 viewed items
      getItemsFromFirestore({ pageSize: 200 }), // Get a good pool of candidates
    ]);

    if (history.length === 0) {
      console.log(`User ${userId} has no view history. Cannot generate recommendations.`);
      return [];
    }

    const candidateItems = candidates.filter(c => 
        c.sellerId !== userId && 
        !history.some(h => h.itemId === c.id) &&
        !c.isSold
    );
    
    if (candidateItems.length === 0) {
        console.log('No suitable candidate items to recommend.');
        return [];
    }
    
    const flowInput: SuggestRecommendationsInput = {
      history: history.map(h => ({ name: h.name, category: h.category, description: h.description || '' })),
      candidates: candidateItems.map(c => ({ id: c.id, name: c.name, category: c.category, description: c.description || '' })),
    };

    const { recommendedItemIds } = await suggestRecommendationsFlow(flowInput);

    if (!recommendedItemIds || recommendedItemIds.length === 0) {
      console.log('AI flow returned no recommendations.');
      return [];
    }

    // Fetch the full item details for the recommended IDs
    const recommendedItems = await Promise.all(
      recommendedItemIds.map(id => getItemByIdFromFirestore(id))
    );

    // Filter out any nulls (if an item was deleted between recommendation and fetch)
    return recommendedItems.filter((item): item is Item => item !== null);
    
  } catch (error) {
    console.error(`Error getting personalized recommendations for user ${userId}:`, error);
    return [];
  }
}
