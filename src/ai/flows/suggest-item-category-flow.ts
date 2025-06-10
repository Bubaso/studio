
'use server';
/**
 * @fileOverview An AI agent that suggests an item category based on its description.
 *
 * - suggestItemCategory - A function that handles the item category suggestion process.
 * - SuggestItemCategoryInput - The input type for the suggestItemCategory function.
 * - SuggestItemCategoryOutput - The return type for the suggestItemCategory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { ItemCategories } from '@/lib/types'; // Import your predefined categories

const SuggestItemCategoryInputSchema = z.object({
  itemDescription: z
    .string()
    .min(10, 'Item description must be at least 10 characters long.')
    .describe('The description of the item for which a category is suggested.'),
  // Potentially add image analysis input later if desired
});
export type SuggestItemCategoryInput = z.infer<typeof SuggestItemCategoryInputSchema>;

const SuggestItemCategoryOutputSchema = z.object({
  suggestedCategory: z
    .enum(ItemCategories) // Ensure the output is one of the valid categories
    .describe('The most likely category for the item based on its description.'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('The confidence score (0.0 to 1.0) for the suggested category.'),
  reasoning: z
    .string()
    .optional()
    .describe('Brief reasoning for the category suggestion.'),
});
export type SuggestItemCategoryOutput = z.infer<typeof SuggestItemCategoryOutputSchema>;

export async function suggestItemCategory(input: SuggestItemCategoryInput): Promise<SuggestItemCategoryOutput> {
  return suggestItemCategoryFlow(input);
}

const validCategoriesString = ItemCategories.join(', ');

const prompt = ai.definePrompt({
  name: 'suggestItemCategoryPrompt',
  input: {schema: SuggestItemCategoryInputSchema},
  output: {schema: SuggestItemCategoryOutputSchema},
  prompt: `You are an expert at categorizing items for an online marketplace. Based on the item description, suggest the most appropriate category from the following list: ${validCategoriesString}.

Item Description:
{{{itemDescription}}}

Your task:
1.  Analyze the item description.
2.  Choose the single best category from the provided list.
3.  Provide a confidence score (between 0.0 for no confidence and 1.0 for very high confidence) for your suggestion.
4.  Optionally, provide a very brief reasoning for your choice.

The output must strictly be one of the categories from this list: ${validCategoriesString}.
If the description is too vague or doesn't fit any category well, pick the most plausible one with a low confidence score, or "Autre" (Other).
`,
});

const suggestItemCategoryFlow = ai.defineFlow(
  {
    name: 'suggestItemCategoryFlow',
    inputSchema: SuggestItemCategoryInputSchema,
    outputSchema: SuggestItemCategoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);

    if (output && ItemCategories.includes(output.suggestedCategory as (typeof ItemCategories)[number])) {
      return output;
    }
    // Fallback if AI output is null or suggests an invalid category
    console.warn('AI suggested an invalid category or output was null. Falling back.');
    return {
      suggestedCategory: 'Autre', // Default to 'Other'
      confidence: 0.1, // Low confidence for fallback
      reasoning: 'AI could not confidently determine a category, or the suggestion was invalid.',
    };
  }
);

    