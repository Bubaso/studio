
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Sparkles, Loader2, Lightbulb, Check } from 'lucide-react';
import { suggestTitle, SuggestTitleInput } from '@/ai/flows/suggest-title-flow';
import { useTranslations } from 'next-intl';

interface TitleSuggestionProps {
  itemDescription: string;
  onTitleSuggested: (title: string) => void;
}

export function TitleSuggestion({ itemDescription, onTitleSuggested }: TitleSuggestionProps) {
  const t = useTranslations('TitleSuggestion');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggestTitles = async () => {
    if (!itemDescription || itemDescription.trim().length < 20) {
      setError(t('errorMinChars'));
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuggestions([]);

    try {
      const input: SuggestTitleInput = { itemDescription };
      const result = await suggestTitle(input);
      setSuggestions(result.suggestedTitles);
    } catch (e) {
      console.error('Erreur lors de la suggestion de titres :', e);
      setError(t('errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  const applySuggestion = (title: string) => {
    onTitleSuggested(title);
    setSuggestions([]); // Clear suggestions after applying one
  };

  return (
    <div className="space-y-4 rounded-lg border p-4 bg-primary/5 border-primary/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center text-sm font-medium text-primary">
          <Sparkles className="mr-2 h-4 w-4" />
          {t('title')}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleSuggestTitles}
          disabled={isLoading || !itemDescription || itemDescription.trim().length < 20}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="mr-2 h-4 w-4" />
          )}
          {t('button')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="text-xs">
          <AlertTitle>{t('errorTitle')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('suggestionPrefix')}</p>
          <ul className="space-y-2">
            {suggestions.map((title, index) => (
              <li key={index}>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-start h-auto py-2 px-3 text-left hover:bg-accent hover:text-accent-foreground"
                  onClick={() => applySuggestion(title)}
                >
                   <Check className="mr-2 h-4 w-4 text-green-500" />
                  {title}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
