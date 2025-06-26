"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Sparkles, Loader2, Lightbulb, Check } from 'lucide-react';
import { suggestItemCategory, SuggestItemCategoryInput } from '@/ai/flows/suggest-item-category-flow';
import type { ItemCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CategorySuggestionProps {
  itemDescription: string;
  onCategorySuggested: (category: ItemCategory) => void;
  currentCategory: ItemCategory | undefined;
}

export function CategorySuggestion({ itemDescription, onCategorySuggested, currentCategory }: CategorySuggestionProps) {
  const [suggestion, setSuggestion] = useState<{ category: ItemCategory; confidence: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionApplied, setSuggestionApplied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (suggestionApplied) {
      return;
    }
    
    if (!itemDescription || itemDescription.trim().length < 20) {
      setSuggestion(null);
      return;
    }

    const handler = setTimeout(() => {
      const fetchSuggestion = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const input: SuggestItemCategoryInput = { itemDescription };
          const result = await suggestItemCategory(input);

          if (result && result.suggestedCategory && result.confidence > 0.5 && result.suggestedCategory !== currentCategory) {
            setSuggestion({
              category: result.suggestedCategory,
              confidence: result.confidence,
            });
          } else {
            setSuggestion(null);
          }
        } catch (e: any) {
          console.error('Erreur lors de la suggestion de catégorie :', e);
          setError('Impossible de suggérer une catégorie pour le moment.');
          setSuggestion(null);
        } finally {
          setIsLoading(false);
        }
      };

      fetchSuggestion();
    }, 1200);

    return () => {
      clearTimeout(handler);
      setIsLoading(false);
    };
  }, [itemDescription, currentCategory, suggestionApplied]);

  const applySuggestion = useCallback(() => {
    if (suggestion) {
      onCategorySuggested(suggestion.category);
      setSuggestion(null);
      setSuggestionApplied(true);
      toast({
        title: "Catégorie Appliquée",
        description: `La catégorie "${suggestion.category}" a été sélectionnée.`,
      });
    }
  }, [suggestion, onCategorySuggested, toast]);

  if (isLoading) {
    return (
      <div className="mt-2 flex h-10 items-center justify-start gap-2 rounded-md bg-muted/50 px-3 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>L'IA analyse la description...</span>
      </div>
    );
  }

  if (error) {
     return (
       <div className="mt-2 flex h-10 items-center justify-start gap-2 rounded-md bg-destructive/10 px-3 text-xs text-destructive">
         <span>{error}</span>
       </div>
     )
  }

  if (suggestion) {
    return (
      <div className="mt-2 flex flex-col items-stretch gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 flex-shrink-0 text-primary" />
            <p className="text-sm">
                <span className="text-muted-foreground">Suggestion IA :</span>{' '}
                <strong className="font-bold text-primary">{suggestion.category}</strong>
                <span className="ml-1.5 text-xs text-muted-foreground">
                    (Fiabilité : {Math.round(suggestion.confidence * 100)}%)
                </span>
            </p>
        </div>
        <Button
            type="button"
            size="sm"
            onClick={applySuggestion}
            className="w-full flex-shrink-0 sm:w-auto"
        >
            <Check className="mr-2 h-4 w-4" />
            Choisir cette catégorie
        </Button>
      </div>
    );
  }

  return null;
}
