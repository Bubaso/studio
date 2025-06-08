import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ItemCard } from '@/components/item-card';
import { getMockItems } from '@/lib/mock-data';
import type { Item } from '@/lib/types';
import { ArrowRight, Search, ShoppingCart } from 'lucide-react';

export default async function HomePage() {
  const featuredItems: Item[] = (await getMockItems()).slice(0, 4); // Get first 4 items as featured

  return (
    <div className="space-y-12">
      <section className="text-center py-16 bg-card rounded-lg shadow-md">
        <div className="container">
          <h1 className="text-5xl font-bold font-headline mb-6 text-primary">Welcome to ReFind</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover unique secondhand treasures or sell your pre-loved items. Join our community and embrace sustainable shopping!
          </p>
          <div className="space-x-4">
            <Link href="/browse">
              <Button size="lg" className="font-bold">
                Browse Items <Search className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/sell">
              <Button size="lg" variant="outline" className="font-bold">
                Start Selling <ShoppingCart className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-bold font-headline mb-8 text-center">Featured Items</h2>
        {featuredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">No featured items available at the moment.</p>
        )}
        <div className="text-center mt-8">
          <Link href="/browse">
            <Button variant="link" className="text-lg text-primary hover:text-accent transition-colors">
              View All Items <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-12 bg-card rounded-lg shadow-md">
        <div className="container grid md:grid-cols-3 gap-8 text-center">
          <div>
            <Search className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-headline font-semibold mb-2">Discover Treasures</h3>
            <p className="text-muted-foreground">Find unique items from local sellers and across the country.</p>
          </div>
          <div>
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-headline font-semibold mb-2">Easy Selling</h3>
            <p className="text-muted-foreground">List your items in minutes and reach thousands of buyers.</p>
          </div>
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-primary"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
            <h3 className="text-xl font-headline font-semibold mb-2">Eco-Friendly</h3>
            <p className="text-muted-foreground">Give items a second life and contribute to a sustainable future.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
