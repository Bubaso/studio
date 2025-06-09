
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ItemCard } from '@/components/item-card';
import { getMockItems } from '@/lib/mock-data';
import type { Item } from '@/lib/types';
import { ArrowRight, Search, ShoppingCart } from 'lucide-react';

export default async function HomePage() {
  const featuredItems: Item[] = (await getMockItems()).slice(0, 4); 

  return (
    <div className="space-y-12">
      <section className="text-center py-16 bg-card rounded-lg shadow-md">
        <div className="container">
          <h1 className="text-5xl font-bold font-headline mb-6 text-primary">Bienvenue sur ReFind</h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Découvrez des trésors de seconde main uniques ou vendez vos articles préférés. Rejoignez notre communauté et adoptez le shopping durable !
          </p>
          <div className="space-x-4">
            <Link href="/browse">
              <Button size="lg" className="font-bold">
                Parcourir les articles <Search className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/sell">
              <Button size="lg" variant="outline" className="font-bold">
                Commencer à vendre <ShoppingCart className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-bold font-headline mb-8 text-center">Articles à la Une</h2>
        {featuredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">Aucun article à la une pour le moment.</p>
        )}
        <div className="text-center mt-8">
          <Link href="/browse">
            <Button variant="link" className="text-lg text-primary hover:text-accent transition-colors">
              Voir tous les articles <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="py-12 bg-card rounded-lg shadow-md">
        <div className="container grid md:grid-cols-3 gap-8 text-center">
          <div>
            <Search className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-headline font-semibold mb-2">Découvrez des Trésors</h3>
            <p className="text-muted-foreground">Trouvez des articles uniques auprès de vendeurs locaux et de tout le pays.</p>
          </div>
          <div>
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h3 className="text-xl font-headline font-semibold mb-2">Vente Facile</h3>
            <p className="text-muted-foreground">Listez vos articles en quelques minutes et touchez des milliers d'acheteurs.</p>
          </div>
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-primary"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
            <h3 className="text-xl font-headline font-semibold mb-2">Écologique</h3>
            <p className="text-muted-foreground">Donnez une seconde vie aux objets et contribuez à un avenir durable.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
