"use client";

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Sparkles, Loader2, Lightbulb, Check, RefreshCw } from 'lucide-react';
import { suggestDescription, SuggestDescriptionInput } from '@/ai/flows/suggest-description-flow';
import { useToast } from '@/hooks/use-toast';

interface DescriptionSuggestionProps {
  itemDescription: string;
  onDescriptionSuggested: (description: string) => void;
}

export function DescriptionSuggestion({ itemDescription, onDescriptionSuggested }: DescriptionSuggestionProps) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSuggestDescription = useCallback(async () => {
    if (!itemDescription || itemDescription.trim().length < 20) {
      setError('Veuillez fournir une description plus détaillée (au moins 20 caractères) pour obtenir une suggestion.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const input: SuggestDescriptionInput = { itemDescription };
      const result = await suggestDescription(input);
      if (result.suggestedDescription) {
        setSuggestion(result.suggestedDescription);
      } else {
        setError('Impossible de générer une suggestion. Veuillez essayer de modifier votre description.');
      }
    } catch (e) {
      console.error('Erreur lors de la suggestion de description :', e);
      setError('Impossible de suggérer une description. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  }, [itemDescription]);

  const applySuggestion = () => {
    if (suggestion) {
      onDescriptionSuggested(suggestion);
      setSuggestion(null); // Clear suggestion after applying one
      toast({
        title: "Description Appliquée",
        description: "La description suggérée par l'IA a été appliquée.",
      });
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-dashed p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center text-sm font-medium">
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
          Voulez-vous améliorer votre description ?
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSuggestDescription}
          disabled={isLoading || !itemDescription || itemDescription.trim().length < 20}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="mr-2 h-4 w-4" />
          )}
          Obtenir une suggestion
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
          <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
            {suggestion}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSuggestDescription}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Suggérer une autre
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={applySuggestion}
            >
              <Check className="mr-2 h-4 w-4" />
              Accepter la suggestion
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
