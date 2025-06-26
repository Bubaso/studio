
"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Sparkles, Loader2, Lightbulb, Check } from 'lucide-react';
import { suggestItemCategory, SuggestItemCategoryInput } from '@/ai/flows/suggest-item-category-flow';
import type { ItemCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface CategorySuggestionProps {
  itemDescription: string;
  onCategorySuggested: (category: ItemCategory) => void;
}

export function CategorySuggestion({ itemDescription, onCategorySuggested }: CategorySuggestionProps) {
  const [suggestion, setSuggestion] = useState<ItemCategory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSuggestCategory = useCallback(async () => {
    if (!itemDescription || itemDescription.trim().length < 10) {
      setError('Veuillez fournir une description plus détaillée (au moins 10 caractères) pour obtenir une suggestion de catégorie.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const input: SuggestItemCategoryInput = { itemDescription };
      const result = await suggestItemCategory(input);
      if (result.suggestedCategory) {
        setSuggestion(result.suggestedCategory);
      } else {
        setError('Impossible de générer une suggestion. Veuillez essayer de modifier votre description.');
      }
    } catch (e: any) {
      console.error('Erreur lors de la suggestion de catégorie :', e);
      setError('Impossible de suggérer une catégorie. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [itemDescription]);

  const applySuggestion = () => {
    if (suggestion) {
      onCategorySuggested(suggestion);
      setSuggestion(null);
      toast({
        title: "Catégorie Appliquée",
        description: "La catégorie suggérée par l'IA a été appliquée.",
      });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-dashed p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center text-sm font-medium">
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
          Pas sûr(e) de la catégorie ?
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSuggestCategory}
          disabled={isLoading || !itemDescription || itemDescription.trim().length < 10}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="mr-2 h-4 w-4" />
          )}
          Suggérer une catégorie
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="text-xs">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {suggestion && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Suggestion de l'IA :</p>
          <div className="p-3 bg-muted rounded-md text-sm font-bold text-primary">
            {suggestion}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={applySuggestion}
            >
              <Check className="mr-2 h-4 w-4" />
              Appliquer la suggestion
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
