
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ItemCard } from '@/components/item-card';
import { getItemsFromFirestore } from '@/services/itemService';
import type { Item } from '@/lib/types';
import { CategoryCarousel } from '@/components/category-carousel'; // Yeni bileşen import edildi
import { Search, ShoppingBag, MessageCircleHeart } from 'lucide-react';

const carouselCategories = [
  { name: 'Électronique', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Électronique', dataAiHint: 'electronics gadgets' },
  { name: 'Mode', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Vêtements%20et%20Accessoires', dataAiHint: 'fashion clothing' },
  { name: 'Maison', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Maison%20et%20Jardin', dataAiHint: 'home decor' },
  { name: 'Sport', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Sports%20et%20Plein%20Air', dataAiHint: 'sports equipment' },
  { name: 'Livres', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Livres,%20Films%20et%20Musique', dataAiHint: 'books media' },
  { name: 'Véhicules', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Véhicules', dataAiHint: 'vehicles cars' },
];

export default async function HomePage() {
  let featuredItems: Item[] = [];
  try {
    featuredItems = await getItemsFromFirestore({ count: 4, query: '' });
  } catch (error) {
    console.error("Erreur lors de la récupération des articles pour la page d'accueil:", error);
  }

  return (
    <div className="space-y-8 md:space-y-10">
      {/* New Category Carousel Section */}
      <section className="mb-8 md:mb-12">
        <h2 className="text-2xl font-bold font-headline text-primary mb-4 px-1">Explorer par Catégorie</h2>
        <CategoryCarousel categories={carouselCategories} />
      </section>

      {/* Featured Items Section */}
      {featuredItems.length > 0 && (
        <section className="py-8">
          <h2 className="text-3xl font-bold font-headline text-center mb-8 text-primary">
            Dernières trouvailles sur ReFind
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {featuredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
           <div className="text-center mt-10">
            <Link href="/browse">
              <Button variant="secondary" size="lg">Voir tous les articles</Button>
            </Link>
          </div>
        </section>
      )}

      {/* How it Works Section - App Introduction */}
      <section className="py-8 bg-card/50 rounded-lg">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div className="p-6 bg-background rounded-lg hover:shadow-xl transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full inline-block mb-3">
                <Search className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold font-headline mb-1">Découvrez</h3>
              <p className="text-sm text-muted-foreground">
                Explorez des milliers d'articles uniques mis en vente par des vendeurs de votre communauté et d'ailleurs.
              </p>
            </div>
            <div className="p-6 bg-background rounded-lg hover:shadow-xl transition-shadow">
              <div className="p-3 bg-primary/10 rounded-full inline-block mb-3">
                <ShoppingBag className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold font-headline mb-1">Vendez Facilement</h3>
              <p className="text-sm text-muted-foreground">
                Mettez en vente vos articles en quelques clics. Ajoutez des photos, une description et fixez votre prix.
              </p>
            </div>
            <div className="p-6 bg-background rounded-lg hover:shadow-xl transition-shadow">
               <div className="p-3 bg-primary/10 rounded-full inline-block mb-3">
                <MessageCircleHeart className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold font-headline mb-1">Connectez-vous</h3>
              <p className="text-sm text-muted-foreground">
                Communiquez directement avec les acheteurs et vendeurs via notre messagerie sécurisée.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
