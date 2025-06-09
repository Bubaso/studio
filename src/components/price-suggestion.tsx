
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
      setError('Veuillez d\'abord fournir une description de l\'article.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuggestedPrice(null);
    setReasoning(null);

    try {
      const input: SuggestPriceInput = {
        itemDescription,
        similarItems: similarItems.trim() || 'Aucun article similaire fourni.',
      };
      const result = await suggestPrice(input);
      const roundedPrice = Math.round(result.suggestedPrice); // FCFA generally doesn't use decimals
      setSuggestedPrice(roundedPrice);
      setReasoning(result.reasoning);
      onPriceSuggested(roundedPrice);
    } catch (e) {
      console.error('Erreur lors de la suggestion de prix:', e);
      setError('Impossible de suggérer un prix. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center font-headline">
          <Wand2 className="mr-2 h-5 w-5 text-primary" />
          Suggestion de Prix par IA
        </CardTitle>
        <CardDescription>
          Obtenez une suggestion de prix alimentée par l'IA basée sur la description de votre article et, éventuellement, des articles similaires. Le prix sera en FCFA.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
            <Label htmlFor="item-description-preview">Description de l'article (ci-dessus)</Label>
            <Textarea
                id="item-description-preview"
                value={itemDescription || "Veuillez remplir la description de l'article dans le formulaire principal."}
                readOnly
                rows={3}
                className="bg-muted"
            />
        </div>
        <div>
          <Label htmlFor="similar-items">Articles similaires (Optionnel)</Label>
          <Textarea
            id="similar-items"
            placeholder="ex: T-Shirt Marque X, taille M, bon état - 10000 FCFA&#x0a;Un autre article similaire - 12000 FCFA"
            value={similarItems}
            onChange={(e) => setSimilarItems(e.target.value)}
            rows={3}
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Listez quelques articles similaires et leurs prix pour améliorer la précision. Un article par ligne.
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
          Suggérer un prix (FCFA)
        </Button>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {suggestedPrice !== null && reasoning && (
          <Alert variant="default" className="bg-accent/10 border-accent/50">
            <AlertTitle className="text-accent font-semibold">Prix suggéré : {suggestedPrice.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</AlertTitle>
            <AlertDescription className="text-accent/90">{reasoning}</AlertDescription>
          </Alert>
        )}
      </CardFooter>
    </Card>
  );
}
