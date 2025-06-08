"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, Loader2 } from 'lucide-react';
import { suggestPrice, SuggestPriceInput } from '@/ai/flows/suggest-price';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface PriceSuggestionProps {
  itemDescription: string;
  onPriceSuggested: (price: number) => void;
}

export function PriceSuggestion({ itemDescription, onPriceSuggested }: PriceSuggestionProps) {
  const [similarItems, setSimilarItems] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggestPrice = async () => {
    if (!itemDescription.trim()) {
      setError('Please provide an item description first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuggestedPrice(null);
    setReasoning(null);

    try {
      const input: SuggestPriceInput = {
        itemDescription,
        similarItems: similarItems.trim() || 'No similar items provided.',
      };
      const result = await suggestPrice(input);
      setSuggestedPrice(result.suggestedPrice);
      setReasoning(result.reasoning);
      onPriceSuggested(result.suggestedPrice);
    } catch (e) {
      console.error('Error suggesting price:', e);
      setError('Failed to suggest a price. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center font-headline">
          <Wand2 className="mr-2 h-5 w-5 text-primary" />
          AI Price Suggestion
        </CardTitle>
        <CardDescription>
          Get an AI-powered price suggestion based on your item description and optionally, similar items.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
            <Label htmlFor="item-description-preview">Item Description (from above)</Label>
            <Textarea
                id="item-description-preview"
                value={itemDescription || "Please fill item description in the main form."}
                readOnly
                rows={3}
                className="bg-muted"
            />
        </div>
        <div>
          <Label htmlFor="similar-items">Similar Items (Optional)</Label>
          <Textarea
            id="similar-items"
            placeholder="e.g., Brand X T-Shirt, size M, good condition - $15&#x0a;Another similar item - $20"
            value={similarItems}
            onChange={(e) => setSimilarItems(e.target.value)}
            rows={3}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            List a few similar items and their prices to improve accuracy. One item per line.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4">
        <Button onClick={handleSuggestPrice} disabled={isLoading || !itemDescription.trim()}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Suggest Price
        </Button>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {suggestedPrice !== null && reasoning && (
          <Alert variant="default" className="bg-accent/10 border-accent/50">
            <AlertTitle className="text-accent font-semibold">Suggested Price: ${suggestedPrice.toFixed(2)}</AlertTitle>
            <AlertDescription className="text-accent/90">{reasoning}</AlertDescription>
          </Alert>
        )}
      </CardFooter>
    </Card>
  );
}
