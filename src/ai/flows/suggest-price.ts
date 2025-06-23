
'use server';

/**
 * @fileOverview An AI agent that suggests a price range for an item based on its description.
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
});
export type SuggestPriceInput = z.infer<typeof SuggestPriceInputSchema>;

const SuggestPriceOutputSchema = z.object({
  suggestedPriceLow: z
    .number()
    .describe('The lower bound of the suggested price range for the item, in XOF (West African CFA franc). (Output as a number)'),
  suggestedPriceOptimal: z
    .number()
    .describe('The optimal suggested price for the item, in XOF (West African CFA franc). (Output as a number)'),
  suggestedPriceHigh: z
    .number()
    .describe('The upper bound of the suggested price range for the item, in XOF (West African CFA franc). (Output as a number)'),
  reasoning: z
    .string()
    .describe('The reasoning behind the suggested price range and optimal price.'),
  currency: z.string().default('XOF').describe('The currency of the suggested price. Always XOF (West African CFA franc) for this context.'),
});
export type SuggestPriceOutput = z.infer<typeof SuggestPriceOutputSchema>;

export async function suggestPrice(input: SuggestPriceInput): Promise<SuggestPriceOutput> {
  return suggestPriceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPriceRangePrompt',
  input: {schema: SuggestPriceInputSchema},
  output: {schema: SuggestPriceOutputSchema},
  prompt: `You are an expert in pricing secondhand items in West Africa. Given the description of the item, you will suggest a realistic price range (low, optimal, high) for the item in XOF (West African CFA franc).

Item Description: {{{itemDescription}}}

Consider the condition of the item implied by the description, its brand (if mentioned), and its rarity when suggesting a price range.
Provide a brief reasoning for the suggested price range and optimal price.
The optimal price should generally be within the low and high bounds.

If the input language of the item description is French, provide the reasoning in French.
All price outputs (suggestedPriceLow, suggestedPriceOptimal, suggestedPriceHigh) should always be numbers.
The currency field in the output should always be "XOF".

Example of French reasoning: "Basé sur l'état de l'objet, une fourchette de X à Y XOF semble appropriée, avec un prix optimal de Z XOF. Le prix optimal tient compte de la demande potentielle."
If the description is too vague to make a reasonable suggestion, indicate this in the reasoning and suggest a very broad range or default values like 0 for prices.
Ensure suggestedPriceLow is less than or equal to suggestedPriceOptimal, and suggestedPriceOptimal is less than or equal to suggestedPriceHigh.
`,
});

const suggestPriceFlow = ai.defineFlow(
  {
    name: 'suggestPriceFlow',
    inputSchema: SuggestPriceInputSchema,
    outputSchema: SuggestPriceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output) {
        // Ensure logical price ordering if AI doesn't strictly follow it
        let { suggestedPriceLow, suggestedPriceOptimal, suggestedPriceHigh } = output;
        if (suggestedPriceLow > suggestedPriceOptimal) {
            [suggestedPriceLow, suggestedPriceOptimal] = [suggestedPriceOptimal, suggestedPriceLow];
        }
        if (suggestedPriceOptimal > suggestedPriceHigh) {
            [suggestedPriceOptimal, suggestedPriceHigh] = [suggestedPriceHigh, suggestedPriceOptimal];
        }
         if (suggestedPriceLow > suggestedPriceOptimal) { // Check again after potential swap
            suggestedPriceLow = suggestedPriceOptimal;
        }
        return { ...output, suggestedPriceLow, suggestedPriceOptimal, suggestedPriceHigh, currency: 'XOF' };
    }
    // Fallback if AI output is null, though schema validation should prevent this.
    return {
        suggestedPriceLow: 0,
        suggestedPriceOptimal: 0,
        suggestedPriceHigh: 0,
        reasoning: "Impossible de générer une suggestion de prix pour le moment.",
        currency: "XOF",
    };
  }
);
