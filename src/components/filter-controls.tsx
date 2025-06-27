
"use client";

import { useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ItemCategories, ItemConditions, ItemCondition } from '@/lib/types';
import { Slider } from '@/components/ui/slider';
import { X, MapPin, Loader2, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useDebounce } from '@/hooks/use-debounce';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';

const MAX_PRICE_FCFA = 500000;
const PRICE_STEP_FCFA = 1000;
const ALL_ITEMS_VALUE = "_all_";
const DEBOUNCE_DELAY = 500; // 500ms delay for live filtering

export function FilterControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [categories, setCategories] = useState<string[]>([]);
  const [condition, setCondition] = useState(searchParams.get('condition') || ALL_ITEMS_VALUE);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    parseInt(searchParams.get('minPrice') || '0', 10),
    parseInt(searchParams.get('maxPrice') || MAX_PRICE_FCFA.toString(), 10)
  ]);
  const [location, setLocation] = useState(searchParams.get('location') || '');
  const [isLocationFilterActive, setIsLocationFilterActive] = useState(!!searchParams.get('lat'));
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [radius, setRadius] = useState(parseInt(searchParams.get('radius') || '25', 10));
  const [locationError, setLocationError] = useState<ReactNode | null>(null);

  useEffect(() => {
    setCategories(searchParams.getAll('category'));
    setCondition(searchParams.get('condition') || ALL_ITEMS_VALUE);
    setPriceRange([
      parseInt(searchParams.get('minPrice') || '0', 10),
      parseInt(searchParams.get('maxPrice') || MAX_PRICE_FCFA.toString(), 10)
    ]);
    setLocation(searchParams.get('location') || '');
    const isLocationActive = !!searchParams.get('lat');
    setIsLocationFilterActive(isLocationActive);
    if (isLocationActive) {
      setRadius(parseInt(searchParams.get('radius') || '25', 10));
    }
  }, [searchParams]);

  const filters = useMemo(() => ({
    categories,
    condition,
    priceRange,
    location,
    isLocationFilterActive,
    radius,
  }), [categories, condition, priceRange, location, isLocationFilterActive, radius]);

  const debouncedFilters = useDebounce(filters, DEBOUNCE_DELAY);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    
    params.delete('category');
    if (debouncedFilters.categories.length > 0) {
      debouncedFilters.categories.forEach(cat => params.append('category', cat));
    }
    
    if (debouncedFilters.condition && debouncedFilters.condition !== ALL_ITEMS_VALUE) params.set('condition', debouncedFilters.condition); else params.delete('condition');
    params.set('minPrice', debouncedFilters.priceRange[0].toString());
    params.set('maxPrice', debouncedFilters.priceRange[1].toString());
    if (debouncedFilters.location) params.set('location', debouncedFilters.location); else params.delete('location');

    if (debouncedFilters.isLocationFilterActive && params.get('lat')) {
        params.set('radius', debouncedFilters.radius.toString());
    }
    
    const currentQuery = searchParams.get('q');
    if (currentQuery) {
      params.set('q', currentQuery);
    }
    
    if (params.toString() !== searchParams.toString()) {
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [debouncedFilters, router, pathname, searchParams]);

  const handleCategoryChange = (category: string, checked: boolean | 'indeterminate') => {
    setCategories(prev => {
      if (checked) {
        return [...prev, category];
      } else {
        return prev.filter(c => c !== category);
      }
    });
  };

  const handleLocationFilterChange = (checked: boolean) => {
    setLocationError(null);
    setIsLocationFilterActive(checked);
    if (checked) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsGettingLocation(false);
          const params = new URLSearchParams(searchParams);
          params.set('lat', position.coords.latitude.toString());
          params.set('lng', position.coords.longitude.toString());
          params.set('radius', radius.toString());
          router.replace(`${pathname}?${params.toString()}`);
        },
        (error: GeolocationPositionError) => {
          setIsGettingLocation(false);
          setIsLocationFilterActive(false);
          setLocationError("Impossible de récupérer la position. Veuillez vérifier les autorisations de votre navigateur.");
          toast({ variant: "destructive", title: "Erreur de localisation", description: "Veuillez vérifier les autorisations de votre navigateur." });
        }
      );
    } else {
      const params = new URLSearchParams(searchParams);
      params.delete('lat');
      params.delete('lng');
      params.delete('radius');
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  const handleClearFilters = () => {
    const query = searchParams.get('q');
    const newParams = new URLSearchParams(query ? { q: query } : {});
    router.replace(`${pathname}?${newParams.toString()}`);
  };

  return (
    <div className="space-y-6 pt-6">
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center justify-between">
            <Label htmlFor="location-filter" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Filtrer par proximité
            </Label>
            <Switch
                id="location-filter"
                checked={isLocationFilterActive}
                onCheckedChange={handleLocationFilterChange}
                disabled={isGettingLocation}
            />
        </div>
        {isGettingLocation && (
            <div className="flex items-center text-xs text-muted-foreground pt-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Obtention de votre position...
            </div>
        )}
        {isLocationFilterActive && !locationError && (
          <div className="pt-2">
            <Label htmlFor="radius-slider">Rayon : {radius} km</Label>
            <Slider
              id="radius-slider"
              value={[radius]}
              onValueChange={(value) => setRadius(value[0])}
              min={1} max={100} step={1} className="mt-2"
            />
          </div>
        )}
        {locationError && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Accès à la localisation bloqué</AlertTitle>
            <AlertDescription>{locationError}</AlertDescription>
          </Alert>
        )}
      </div>

      <div>
        <Label>Catégories</Label>
        <ScrollArea className="h-40 w-full rounded-md border p-2">
            <div className="space-y-2">
                {ItemCategories.map(cat => (
                  <div key={cat} className="flex items-center space-x-2">
                    <Checkbox
                        id={`category-${cat}`}
                        checked={categories.includes(cat)}
                        onCheckedChange={(checked) => handleCategoryChange(cat, checked)}
                    />
                    <Label htmlFor={`category-${cat}`} className="font-normal cursor-pointer">{cat}</Label>
                  </div>
                ))}
            </div>
        </ScrollArea>
      </div>

      <div>
        <Label htmlFor="condition">État</Label>
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger id="condition"><SelectValue placeholder="Tous les états" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ITEMS_VALUE}>Tous les états</SelectItem>
            {ItemConditions.map(cond => (
              <SelectItem key={cond} value={cond} className="capitalize">{cond.charAt(0).toUpperCase() + cond.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Fourchette de prix</Label>
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{priceRange[0].toLocaleString('fr-FR')} XOF</span>
          <span>{priceRange[1].toLocaleString('fr-FR')}{priceRange[1] === MAX_PRICE_FCFA ? '+' : ''} XOF</span>
        </div>
        <Slider
          min={0} max={MAX_PRICE_FCFA} step={PRICE_STEP_FCFA}
          value={priceRange}
          onValueChange={(newRange) => setPriceRange(newRange as [number, number])}
          className="my-2"
        />
      </div>

      <div>
        <Label htmlFor="location">Lieu (Texte)</Label>
        <Input 
          id="location" 
          placeholder="ex: Dakar, SN" 
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className="flex flex-col space-y-2 pt-4">
        <Button variant="outline" onClick={handleClearFilters} className="flex items-center justify-center">
            <X className="h-4 w-4 mr-2" /> Effacer tous les filtres
        </Button>
      </div>
    </div>
  );
}
