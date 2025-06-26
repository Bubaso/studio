
"use client";

import { useState, useEffect } from 'react';
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

const MAX_PRICE_FCFA = 500000; // Max price for slider in FCFA
const PRICE_STEP_FCFA = 1000;
const ALL_ITEMS_VALUE = "_all_"; // Value for "all" options to avoid empty string

export function FilterControls({ onApplied }: { onApplied?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [category, setCategory] = useState(searchParams.get('category') || ALL_ITEMS_VALUE);
  const [condition, setCondition] = useState(searchParams.get('condition') || ALL_ITEMS_VALUE);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    parseInt(searchParams.get('minPrice') || '0', 10),
    parseInt(searchParams.get('maxPrice') || MAX_PRICE_FCFA.toString(), 10)
  ]);
  const [location, setLocation] = useState(searchParams.get('location') || '');
  
  const [isLocationFilterActive, setIsLocationFilterActive] = useState(!!searchParams.get('lat'));
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [radius, setRadius] = useState(parseInt(searchParams.get('radius') || '25', 10));
  const [locationError, setLocationError] = useState<string | null>(null);


  useEffect(() => {
    setCategory(searchParams.get('category') || ALL_ITEMS_VALUE);
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

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams);
    if (category && category !== ALL_ITEMS_VALUE) params.set('category', category); else params.delete('category');
    if (condition && condition !== ALL_ITEMS_VALUE) params.set('condition', condition); else params.delete('condition');
    params.set('minPrice', priceRange[0].toString());
    params.set('maxPrice', priceRange[1].toString());
    if (location) params.set('location', location); else params.delete('location');
    
    // Preserve location filter if active and update radius
    if (isLocationFilterActive && searchParams.get('lat')) {
        params.set('lat', searchParams.get('lat')!);
        params.set('lng', searchParams.get('lng')!);
        params.set('radius', radius.toString()); // Use the state value
    }
    
    const query = searchParams.get('q');
    if (query) {
      params.set('q', query);
    }
    
    router.replace(`${pathname}?${params.toString()}`);
    onApplied?.();
  };
  
  const handleLocationFilterChange = (checked: boolean) => {
    setLocationError(null); // Clear previous errors on new attempt
    
    if (checked) {
      setIsGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsGettingLocation(false);
          setIsLocationFilterActive(true);
          const params = new URLSearchParams(searchParams);
          params.set('lat', position.coords.latitude.toString());
          params.set('lng', position.coords.longitude.toString());

          const newRadius = 25; // Default radius when enabling
          setRadius(newRadius);
          params.set('radius', newRadius.toString());

          router.replace(`${pathname}?${params.toString()}`);
        },
        (error: GeolocationPositionError) => {
          setIsGettingLocation(false);
          setIsLocationFilterActive(false);
          
          let description = "Une erreur inconnue est survenue.";
          let isPermissionError = false;

          switch (error.code) {
              case error.PERMISSION_DENIED:
                  description = "L'accès à la localisation semble bloqué. C'est peut-être parce que vous l'avez refusé précédemment. Veuillez vérifier les permissions pour ce site dans les paramètres de votre navigateur.";
                  isPermissionError = true;
                  break;
              case error.POSITION_UNAVAILABLE:
                  description = "Informations de localisation non disponibles. Vérifiez votre connexion réseau ou votre signal GPS.";
                  break;
              case error.TIMEOUT:
                  description = "La demande de localisation a expiré. Veuillez réessayer.";
                  break;
              default:
                  description = "Impossible d'accéder à votre position. Veuillez vérifier les autorisations de votre navigateur.";
          }

          if (error.message && (error.message.toLowerCase().includes("secure origin") || error.message.toLowerCase().includes("secure context"))) {
              description = "La géolocalisation nécessite une connexion sécurisée (HTTPS). Il est possible que cet environnement de développement ne soit pas considéré comme sécurisé par votre navigateur sur mobile.";
              isPermissionError = true;
          }
          
          if(isPermissionError) {
              setLocationError(description);
          }

          toast({
            variant: "destructive",
            title: "Erreur de localisation",
            description: description,
          });
        }
      );
    } else {
      setIsLocationFilterActive(false);
      const params = new URLSearchParams(searchParams);
      params.delete('lat');
      params.delete('lng');
      params.delete('radius');
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    const query = searchParams.get('q');
    if (query) {
      params.set('q', query); 
    }
    router.replace(`${pathname}?${params.toString()}`);
    onApplied?.();
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
        {isLocationFilterActive && (
          <div className="pt-2">
            <Label htmlFor="radius-slider">Rayon de recherche : {radius} km</Label>
            <Slider
              id="radius-slider"
              value={[radius]}
              onValueChange={(value) => setRadius(value[0])}
              min={1}
              max={100}
              step={1}
              className="mt-2"
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
        <Label htmlFor="category">Catégorie</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_ITEMS_VALUE}>Toutes les catégories</SelectItem>
            {ItemCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="condition">État</Label>
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger id="condition">
            <SelectValue placeholder="Tous les états" />
          </SelectTrigger>
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
          <span>{priceRange[0].toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
          <span>{priceRange[1].toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 })}{priceRange[1] === MAX_PRICE_FCFA ? '+' : ''}</span>
        </div>
        <Slider
          min={0}
          max={MAX_PRICE_FCFA}
          step={PRICE_STEP_FCFA}
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
        <Button onClick={handleApplyFilters}>Appliquer les filtres</Button>
        <Button variant="outline" onClick={handleClearFilters} className="flex items-center justify-center">
            <X className="h-4 w-4 mr-2" /> Effacer les filtres
        </Button>
      </div>
    </div>
  );
}
