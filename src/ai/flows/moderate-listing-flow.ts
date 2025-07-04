
'use server';
/**
 * @fileOverview An AI agent that moderates new listings for potential fraud or prohibited content.
 *
 * - moderateListing - A function that handles the listing moderation process.
 * - ModerateListingInput - The input type for the moderateListing function.
 * - ModerateListingOutput - The return type for the moderateListing function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ModerateListingInputSchema = z.object({
  name: z.string().describe('The name of the item being sold.'),
  description: z.string().describe('The full description of the item.'),
  imageUrls: z.array(z.string()).describe('An array of URLs for the item\'s images.'),
});
export type ModerateListingInput = z.infer<typeof ModerateListingInputSchema>;

const ModerateListingOutputSchema = z.object({
  isSuspicious: z.boolean().describe('Whether the listing is suspicious and needs manual review.'),
  reasoning: z.string().describe('A brief explanation for why the listing is considered suspicious. "N/A" if not suspicious.'),
  category: z
    .enum(['safe', 'prohibited_item', 'scam_behavior', 'other'])
    .describe('The category of the suspicion. "safe" if not suspicious.'),
});
export type ModerateListingOutput = z.infer<typeof ModerateListingOutputSchema>;

export async function moderateListing(input: ModerateListingInput): Promise<ModerateListingOutput> {
  return moderateListingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'moderateListingPrompt',
  input: { schema: ModerateListingInputSchema },
  output: { schema: ModerateListingOutputSchema },
  prompt: `You are an expert content moderator for a secondhand marketplace in West Africa. Your task is to analyze new listings for potential scams, prohibited items, or policy violations.

Analyze the provided item details (name, description, and images) and determine if it requires manual review.

**Your analysis should check for:**

1.  **Scam Behavior:**
    *   Language that creates false urgency (e.g., "must sell today!", "limited time only").
    *   Requests to communicate or pay outside the platform (e.g., "contact me on WhatsApp at...", "pay via Western Union").
    *   Unrealistic pricing (e.g., a new iPhone for a very low price).
    *   Links to external websites.
    *   Keyword stuffing or irrelevant text.

2.  **Prohibited Items:**
    *   Weapons, firearms, or explosives.
    *   Drugs or illegal substances.
    *   Counterfeit or fake goods.
    *   Hate speech or symbols.
    *   Adult content.

3.  **Image-Text Mismatch:**
    *   The images do not match the item's name or description.
    *   The images appear to be professional stock photos rather than user-taken photos, which might indicate a scam.

**Instructions:**

- Based on your analysis, set \`isSuspicious\` to \`true\` if you find any of the above issues. Otherwise, set it to \`false\`.
- If \`isSuspicious\` is \`true\`, provide a concise \`reasoning\` for your decision.
- Categorize the suspicion under \`category\`. If there are multiple issues, pick the most severe one.

**Item Details:**

**Name:** {{{name}}}

**Description:**
{{{description}}}

**Images:**
{{#each imageUrls}}
- {{media url=this}}
{{/each}}
`,
});

const moderateListingFlow = ai.defineFlow(
  {
    name: 'moderateListingFlow',
    inputSchema: ModerateListingInputSchema,
    outputSchema: ModerateListingOutputSchema,
  },
  async (input) => {
    try {
        const { output } = await prompt(input);
        if (!output) {
            throw new Error("AI moderation failed to return an output.");
        }
        return output;
    } catch(error) {
        console.error("Error in moderateListingFlow:", error);
        // Fallback to a safe default: flag for manual review if AI fails.
        return {
            isSuspicious: true,
            reasoning: "AI analysis failed. Manual review required.",
            category: 'other',
        }
    }
  }
);
