
'use server';
/**
 * @fileOverview An AI agent that suggests compelling item titles.
 *
 * - suggestTitle - A function that handles the item title suggestion process.
 * - SuggestTitleInput - The input type for the suggestTitle function.
 * - SuggestTitleOutput - The return type for the suggestTitle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTitleInputSchema = z.object({
  itemDescription: z
    .string()
    .min(20, 'Item description must be at least 20 characters long.')
    .describe('The description of the item for which titles are being suggested.'),
});
export type SuggestTitleInput = z.infer<typeof SuggestTitleInputSchema>;

const SuggestTitleOutputSchema = z.object({
  suggestedTitles: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe('An array of 3 to 5 catchy and descriptive title suggestions for the item.'),
});
export type SuggestTitleOutput = z.infer<typeof SuggestTitleOutputSchema>;

export async function suggestTitle(input: SuggestTitleInput): Promise<SuggestTitleOutput> {
  return suggestTitleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTitlePrompt',
  input: {schema: SuggestTitleInputSchema},
  output: {schema: SuggestTitleOutputSchema},
  prompt: `You are an expert copywriter for a French-speaking West African online marketplace. Your task is to generate compelling, clear, and searchable titles for an item based on its description.

Follow these rules:
1.  **Analyze the Description:** Read the provided item description to understand its key features, brand, condition, and purpose.
2.  **Generate Multiple Options:** Create a list of 3 to 5 distinct title options.
3.  **Be Concise and Clear:** Titles should be short and easy to understand.
4.  **Length:** Titles must not exceed 40 characters.
5.  **Include Keywords:** Use important keywords from the description that a buyer might search for (e.g., "iPhone 12", "robe en wax", "neuf").
6.  **Highlight Condition:** If the condition is mentioned (e.g., "comme neuf", "excellent état"), include it.
7.  **Language:** All titles must be in French.
8.  **Format:** Return the result as a JSON object with a "suggestedTitles" array.

Item Description from seller:
{{{itemDescription}}}

Generate the title suggestions now.
`,
});

const suggestTitleFlow = ai.defineFlow(
  {
    name: 'suggestTitleFlow',
    inputSchema: SuggestTitleInputSchema,
    outputSchema: SuggestTitleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.suggestedTitles || output.suggestedTitles.length === 0) {
        throw new Error("The AI model failed to return valid title suggestions.");
    }
    return output;
  }
);
