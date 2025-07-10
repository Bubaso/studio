
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2, Loader2, CheckCircle } from 'lucide-react';
import { suggestPrice, SuggestPriceInput } from '@/ai/flows/suggest-price';
import { Label } from './ui/label';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useTranslations } from 'next-intl';

interface PriceSuggestionProps {
  itemDescription: string;
  onPriceSuggested: (price: number) => void;
}

export function PriceSuggestion({ itemDescription, onPriceSuggested }: PriceSuggestionProps) {
  const t = useTranslations('PriceSuggestion');
  const [priceRange, setPriceRange] = useState<{ low: number; optimal: number; high: number; currency: string } | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggestPrice = async () => {
    if (!itemDescription.trim()) {
      setError(t('errorNoDescription'));
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
      setError(t('errorGeneric'));
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
    <div className="space-y-4 rounded-lg border p-4 bg-primary/5 border-primary/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center text-sm font-medium text-primary">
                <Wand2 className="mr-2 h-4 w-4" />
                {t('title')}
            </div>
             <Button type="button" onClick={handleSuggestPrice} disabled={isLoading || !itemDescription.trim()} variant="outline" size="sm">
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                )}
                {t('button')}
            </Button>
        </div>
        <p className="text-sm text-muted-foreground">{t('description', { currency: priceRange?.currency || 'FCFA' })}</p>
         
        {error && (
          <Alert variant="destructive">
            <AlertTitle>{t('errorTitle')}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {priceRange && reasoning && (
          <Alert variant="default" className="bg-accent/10 border-accent/50">
            <AlertTitle className="text-accent font-semibold">
              {t('suggestedRange', { low: formatCurrency(priceRange.low, priceRange.currency), high: formatCurrency(priceRange.high, priceRange.currency) })}
            </AlertTitle>
            <AlertDescription className="text-accent/90 mb-2">{reasoning}</AlertDescription>
            <div className="flex flex-col sm:flex-row justify-between items-center mt-2 pt-2 border-t border-accent/20">
              <p className="text-sm text-accent font-medium">
                {t('optimalPrice', { price: formatCurrency(priceRange.optimal, priceRange.currency) })}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleApplyOptimalPrice}
                className="mt-2 sm:mt-0 border-accent text-accent hover:bg-accent/20 hover:text-accent"
              >
                <CheckCircle className="mr-2 h-4 w-4" /> {t('applyPrice')}
              </Button>
            </div>
          </Alert>
        )}
    </div>
  );
}
