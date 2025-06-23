
'use server';
/**
 * @fileOverview An AI agent that suggests an improved item description.
 *
 * - suggestDescription - A function that handles the item description suggestion process.
 * - SuggestDescriptionInput - The input type for the suggestDescription function.
 * - SuggestDescriptionOutput - The return type for the suggestDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDescriptionInputSchema = z.object({
  itemDescription: z
    .string()
    .min(20, 'Item description must be at least 20 characters long.')
    .describe('The original description of the item written by the seller.'),
});
export type SuggestDescriptionInput = z.infer<typeof SuggestDescriptionInputSchema>;

const SuggestDescriptionOutputSchema = z.object({
  suggestedDescription: z
    .string()
    .describe('A well-articulated and corrected version of the description, optimized for sales.'),
  reasoning: z
    .string()
    .optional()
    .describe('A brief explanation of the changes made (e.g., corrected grammar, added selling points).'),
});
export type SuggestDescriptionOutput = z.infer<typeof SuggestDescriptionOutputSchema>;

export async function suggestDescription(input: SuggestDescriptionInput): Promise<SuggestDescriptionOutput> {
  return suggestDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDescriptionPrompt',
  input: {schema: SuggestDescriptionInputSchema},
  output: {schema: SuggestDescriptionOutputSchema},
  prompt: `You are an expert copywriter for an online secondhand marketplace in French-speaking West Africa. Your task is to rewrite a user's item description to make it more appealing and effective for selling.

Follow these rules:
1.  **Correct Grammar and Spelling:** Fix any grammatical errors, typos, or spelling mistakes in the original description.
2.  **Improve Clarity and Structure:** Reorganize the text for better readability. Use short paragraphs or bullet points if it helps.
3.  **Highlight Key Features:** Identify and emphasize the most important selling points (e.g., brand, condition, unique features).
4.  **Do Not Add False Information:** Only use information provided in the original description. Do not invent features or details.
5.  **Maintain Tone:** Keep the tone friendly and trustworthy. Avoid overly aggressive sales language.
6.  **Language:** Respond in French.
7.  **Reasoning:** Briefly explain the key changes you made (e.g., "Correction de la grammaire et mise en avant de l'état 'comme neuf'.").

Original Description from seller:
{{{itemDescription}}}

Rewrite the description and provide your reasoning. The output must be a valid JSON object.
`,
});

const suggestDescriptionFlow = ai.defineFlow(
  {
    name: 'suggestDescriptionFlow',
    inputSchema: SuggestDescriptionInputSchema,
    outputSchema: SuggestDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
        throw new Error("The AI model failed to return a valid description suggestion.");
    }
    return output;
  }
);
