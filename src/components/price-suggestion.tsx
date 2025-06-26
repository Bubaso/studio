
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, Loader2, CheckCircle } from 'lucide-react';
import { suggestPrice, SuggestPriceInput } from '@/ai/flows/suggest-price';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface PriceSuggestionProps {
  itemDescription: string;
  onPriceSuggested: (price: number) => void;
}

export function PriceSuggestion({ itemDescription, onPriceSuggested }: PriceSuggestionProps) {
  const [priceRange, setPriceRange] = useState<{ low: number; optimal: number; high: number; currency: string } | null>(null);
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
    setPriceRange(null);
    setReasoning(null);

    try {
      const input: SuggestPriceInput = {
        itemDescription,
      };
      const result = await suggestPrice(input);
      const optimalPriceRounded = Math.round(result.suggestedPriceOptimal);
      
      setPriceRange({
        low: Math.round(result.suggestedPriceLow),
        optimal: optimalPriceRounded,
        high: Math.round(result.suggestedPriceHigh),
        currency: result.currency,
      });
      setReasoning(result.reasoning);
    } catch (e) {
      console.error('Erreur lors de la suggestion de prix:', e);
      setError('Impossible de suggérer un prix. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyOptimalPrice = () => {
    if (priceRange) {
      onPriceSuggested(priceRange.optimal);
    }
  };

  const formatCurrency = (value: number, currencyCode: string) => {
    return value.toLocaleString('fr-FR', { style: 'currency', currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center font-headline">
          <Wand2 className="mr-2 h-5 w-5 text-primary" />
          Suggestion de Prix par IA
        </CardTitle>
        <CardDescription>
          Obtenez une suggestion de prix et une fourchette réaliste (en {priceRange?.currency || 'FCFA'}) basée sur la description de votre article.
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
      </CardContent>
      <CardFooter className="flex flex-col items-stretch gap-4">
        <Button type="button" onClick={handleSuggestPrice} disabled={isLoading || !itemDescription.trim()}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="mr-2 h-4 w-4" />
          )}
          Suggérer une fourchette de prix
        </Button>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {priceRange && reasoning && (
          <Alert variant="default" className="bg-accent/10 border-accent/50">
            <AlertTitle className="text-accent font-semibold">
              Fourchette Suggérée : {formatCurrency(priceRange.low, priceRange.currency)} - {formatCurrency(priceRange.high, priceRange.currency)}
            </AlertTitle>
            <AlertDescription className="text-accent/90 mb-2">{reasoning}</AlertDescription>
            <div className="flex flex-col sm:flex-row justify-between items-center mt-2 pt-2 border-t border-accent/20">
              <p className="text-sm text-accent font-medium">
                Optimal : {formatCurrency(priceRange.optimal, priceRange.currency)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyOptimalPrice}
                className="mt-2 sm:mt-0 border-accent text-accent hover:bg-accent/20 hover:text-accent"
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Appliquer ce prix
              </Button>
            </div>
          </Alert>
        )}
      </CardFooter>
    </Card>
  );
}
