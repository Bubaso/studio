
"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ItemCategories, ItemConditions, ItemCondition } from '@/lib/types';
import { Slider } from '@/components/ui/slider';
import { X } from 'lucide-react';

const MAX_PRICE_FCFA = 500000; // Max price for slider in FCFA
const PRICE_STEP_FCFA = 1000;
const ALL_ITEMS_VALUE = "_all_"; // Value for "all" options to avoid empty string

export function FilterControls({ onApplied }: { onApplied?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState(searchParams.get('category') || ALL_ITEMS_VALUE);
  const [condition, setCondition] = useState(searchParams.get('condition') || ALL_ITEMS_VALUE);
  const [priceRange, setPriceRange] = useState<[number, number]>([
    parseInt(searchParams.get('minPrice') || '0', 10),
    parseInt(searchParams.get('maxPrice') || MAX_PRICE_FCFA.toString(), 10)
  ]);
  const [location, setLocation] = useState(searchParams.get('location') || '');

  useEffect(() => {
    setCategory(searchParams.get('category') || ALL_ITEMS_VALUE);
    setCondition(searchParams.get('condition') || ALL_ITEMS_VALUE);
    setPriceRange([
      parseInt(searchParams.get('minPrice') || '0', 10),
      parseInt(searchParams.get('maxPrice') || MAX_PRICE_FCFA.toString(), 10)
    ]);
    setLocation(searchParams.get('location') || '');
  }, [searchParams]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams);
    if (category && category !== ALL_ITEMS_VALUE) params.set('category', category); else params.delete('category');
    if (condition && condition !== ALL_ITEMS_VALUE) params.set('condition', condition); else params.delete('condition');
    params.set('minPrice', priceRange[0].toString());
    params.set('maxPrice', priceRange[1].toString());
    if (location) params.set('location', location); else params.delete('location');
    
    const query = searchParams.get('q');
    if (query) {
      params.set('q', query);
    }
    
    router.push(`${pathname}?${params.toString()}`);
    onApplied?.();
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    const query = searchParams.get('q');
    if (query) {
      params.set('q', query); 
    }
    router.push(`${pathname}?${params.toString()}`);
    onApplied?.();
  };

  return (
    <div className="space-y-6 pt-6">
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
        <Label htmlFor="location">Lieu</Label>
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
