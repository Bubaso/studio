
'use server';

/**
 * @fileOverview An AI agent that suggests a price for an item based on its description and similar items listed.
 *
 * - suggestPrice - A function that handles the price suggestion process.
 * - SuggestPriceInput - The input type for the suggestPrice function.
 * - SuggestPriceOutput - The return type for the suggestPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPriceInputSchema = z.object({
  itemDescription: z
    .string()
    .describe('The description of the item for which a price is suggested.'),
  similarItems: z
    .string()
    .describe('The list of similar items and their prices.'),
});
export type SuggestPriceInput = z.infer<typeof SuggestPriceInputSchema>;

const SuggestPriceOutputSchema = z.object({
  suggestedPrice: z
    .number()
    .describe('The suggested price for the item, in US dollars. (Output as a number)'),
  reasoning: z
    .string()
    .describe('The reasoning behind the suggested price.'),
});
export type SuggestPriceOutput = z.infer<typeof SuggestPriceOutputSchema>;

export async function suggestPrice(input: SuggestPriceInput): Promise<SuggestPriceOutput> {
  return suggestPriceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPricePrompt',
  input: {schema: SuggestPriceInputSchema},
  output: {schema: SuggestPriceOutputSchema},
  prompt: `You are an expert in pricing secondhand items. Given the description of the item and a list of similar items and their prices, you will suggest a price for the item in US dollars.

Item Description: {{{itemDescription}}}
Similar Items: {{{similarItems}}}

Consider the condition of the item, its brand, and its rarity when suggesting a price. Provide a brief reasoning for the suggested price.

Output the suggested price as a number and the reasoning as a string.
If the input language is French, provide the reasoning in French.
The suggestedPrice should always be a number, regardless of input language.
Example of French reasoning: "Basé sur des articles similaires et l'état de l'objet, un prix de X $ semble approprié."
`,
});

const suggestPriceFlow = ai.defineFlow(
  {
    name: 'suggestPriceFlow',
    inputSchema: SuggestPriceInputSchema,
    outputSchema: SuggestPriceOutputSchema,
  },
  async input => {
    // If user provides similar items in French with EUR, try to adapt or inform model.
    // For now, prompt assumes USD and numerical price.
    const {output} = await prompt(input);
    return output!;
  }
);
