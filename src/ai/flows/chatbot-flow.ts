
'use server';
/**
 * @fileOverview A chatbot AI agent capable of answering general questions and searching for items.
 *
 * - askChatbot - A function that handles user queries to the chatbot.
 * - ChatbotInput - The input type for the askChatbot function.
 * - ChatbotOutput - The return type for the askChatbot function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getItemsFromFirestore } from '@/services/itemService';
import type { Item } from '@/lib/types';
import { ItemCategories } from '@/lib/types';

// A simplified schema for the items returned by the search tool.
// This keeps the AI response clean and focused.
const ItemResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  category: z.string(),
  location: z.string().optional(),
  imageUrls: z.array(z.string()),
  dataAiHint: z.string().optional(),
});
type ItemResult = z.infer<typeof ItemResultSchema>;

// Define the tool for searching items.
const searchItems = ai.defineTool(
  {
    name: 'searchItems',
    description: 'Search for secondhand items available for sale in the marketplace. Use this when the user is asking for products, goods, or specific items.',
    inputSchema: z.object({
      query: z.string().describe('The user\'s search query, describing the item they want to find. Example: "blue party dress" or "iPhone 12"'),
      category: z.enum(ItemCategories).optional().describe('A specific category to narrow down the search.'),
    }),
    outputSchema: z.array(ItemResultSchema),
  },
  async (input) => {
    console.log(`[Chatbot Tool] Searching for items with query: "${input.query}" in category: ${input.category || 'All'}`);
    const { items } = await getItemsFromFirestore({
      query: input.query,
      categories: input.category ? [input.category] : undefined,
      pageSize: 4, // Return a few items to show in the chat
    });

    // Map the full Item object to the simpler ItemResult
    return items.map((item): ItemResult => ({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      location: item.location,
      imageUrls: item.imageUrls,
      dataAiHint: item.dataAiHint,
    }));
  }
);


// Define the main input and output schemas for the chatbot flow.
export const ChatbotInputSchema = z.object({
  query: z.string(),
  locale: z.string().default('fr').describe("The user's language, e.g., 'fr', 'en', 'tr'"),
});
export type ChatbotInput = z.infer<typeof ChatbotInputSchema>;

export const ChatbotOutputSchema = z.object({
  answer: z.string().describe('A helpful, conversational response to the user\'s query.'),
  items: z.array(ItemResultSchema).optional().describe('A list of relevant items if the user was searching for products.'),
});
export type ChatbotOutput = z.infer<typeof ChatbotOutputSchema>;


const chatbotPrompt = ai.definePrompt({
    name: 'chatbotPrompt',
    input: { schema: ChatbotInputSchema },
    output: { schema: ChatbotOutputSchema },
    tools: [searchItems],
    system: `You are a friendly and helpful assistant for an online secondhand marketplace in West Africa called JëndJaay.
Your primary languages are French, English, and Turkish. Always respond in the user's specified locale: {{{locale}}}.

Your two main tasks are:
1.  **Answering General Questions:** If the user asks about how to use the app, policies, or general information (e.g., "How do I sell an item?", "What is the return policy?", "Comment puis-je contacter un vendeur?"), provide a clear and concise answer. The return policy is that all sales are final between the buyer and seller. To sell an item, the user should click the "Sell" button.
2.  **Searching for Products:** If the user's query describes an item they want to buy (e.g., "I'm looking for a blue dress," "un téléphone Samsung," "eski kitaplar"), you MUST use the \`searchItems\` tool to find relevant products.
    - After using the tool, if items are found, your answer should be a friendly message like "Here are some items I found for you:" or "Voici quelques articles qui pourraient vous intéresser :".
    - If no items are found, inform the user kindly, e.g., "Sorry, I couldn't find any items matching your search." or "Désolé, je n'ai trouvé aucun article correspondant.".
    - Do NOT make up items. Only present the items returned by the tool.

Be conversational and welcoming. Do not repeat the user's question in your answer.
`,
});


const chatbotFlow = ai.defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: ChatbotInputSchema,
    outputSchema: ChatbotOutputSchema,
  },
  async (input) => {
    const { output } = await chatbotPrompt(input);
    if (!output) {
      return { answer: "Désolé, je ne peux pas répondre pour le moment." };
    }
    // The `items` array in the output will be automatically populated by the tool's result if the LLM decides to call it.
    return output;
  }
);

/**
 * Main function to interact with the chatbot AI.
 * @param {ChatbotInput} input - The user's query and locale.
 * @returns {Promise<ChatbotOutput>} A conversational answer and an optional list of found items.
 */
export async function askChatbot(input: ChatbotInput): Promise<ChatbotOutput> {
  // We add a cast here because the `searchItems` tool returns a partial Item object,
  // but we want to treat it as the full Item type on the client for rendering with ItemCard.
  // This is safe as long as ItemResultSchema is a subset of the Item type.
  return chatbotFlow(input) as Promise<ChatbotOutput & { items?: Item[] }>;
}
