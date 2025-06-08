"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ItemCategories, ItemConditions } from '@/lib/types';
import { Slider } from '@/components/ui/slider';
import { X } from 'lucide-react';

export function FilterControls() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [priceRange, setPriceRange] = useState<[number, number]>([
    parseInt(searchParams.get('minPrice') || '0', 10),
    parseInt(searchParams.get('maxPrice') || '1000', 10)
  ]);
  const [location, setLocation] = useState(searchParams.get('location') || '');

  useEffect(() => {
    // Sync state with URL params on initial load or when params change
    setCategory(searchParams.get('category') || '');
    setCondition(searchParams.get('condition') || '');
    setPriceRange([
      parseInt(searchParams.get('minPrice') || '0', 10),
      parseInt(searchParams.get('maxPrice') || '1000', 10)
    ]);
    setLocation(searchParams.get('location') || '');
  }, [searchParams]);

  const handleApplyFilters = () => {
    const params = new URLSearchParams(searchParams);
    if (category) params.set('category', category); else params.delete('category');
    if (condition) params.set('condition', condition); else params.delete('condition');
    params.set('minPrice', priceRange[0].toString());
    params.set('maxPrice', priceRange[1].toString());
    if (location) params.set('location', location); else params.delete('location');
    
    // Preserve search query if present
    const query = searchParams.get('q');
    if (query) {
      params.set('q', query);
    }
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    const query = searchParams.get('q');
    if (query) {
      params.set('q', query); // Preserve search query
    }
    router.push(`${pathname}?${params.toString()}`);
    // Reset local state, will be further synced by useEffect
    setCategory('');
    setCondition('');
    setPriceRange([0, 1000]);
    setLocation('');
  };

  return (
    <aside className="w-full md:w-72 lg:w-80 space-y-6 p-4 border rounded-lg shadow-sm bg-card">
      <h3 className="text-xl font-headline font-semibold">Filters</h3>
      
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {ItemCategories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="condition">Condition</Label>
        <Select value={condition} onValueChange={setCondition}>
          <SelectTrigger id="condition">
            <SelectValue placeholder="Any Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any Condition</SelectItem>
            {ItemConditions.map(cond => (
              <SelectItem key={cond} value={cond} className="capitalize">{cond}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Price Range</Label>
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>${priceRange[0]}</span>
          <span>${priceRange[1]}{priceRange[1] === 1000 ? '+' : ''}</span>
        </div>
        <Slider
          min={0}
          max={1000}
          step={10}
          value={priceRange}
          onValueChange={(newRange) => setPriceRange(newRange as [number, number])}
          className="my-2"
        />
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input 
          id="location" 
          placeholder="e.g. New York, Zip Code" 
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div className="flex flex-col space-y-2">
        <Button onClick={handleApplyFilters}>Apply Filters</Button>
        <Button variant="outline" onClick={handleClearFilters} className="flex items-center justify-center">
            <X className="h-4 w-4 mr-2" /> Clear Filters
        </Button>
      </div>
    </aside>
  );
}
