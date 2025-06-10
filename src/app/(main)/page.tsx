
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ItemCard } from '@/components/item-card';
import { getItemsFromFirestore } from '@/services/itemService';
import type { Item, ItemCategory } from '@/lib/types';
import { CategoryCarousel } from '@/components/category-carousel';
import { Search, ShoppingBag, MessageCircleHeart, PlusCircle } from 'lucide-react';

// Updated to include new categories and ensure diversity, with specific data-ai-hints
const carouselCategories = [
  { name: 'Électronique', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Électronique', dataAiHint: 'electronics gadgets' },
  { name: 'Téléphones et Portables', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Téléphones%20et%20Portables', dataAiHint: 'smartphones mobiles' },
  { name: 'Vêtements et Accessoires', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Vêtements%20et%20Accessoires', dataAiHint: 'fashion clothing' },
  { name: 'Mobilier', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Mobilier', dataAiHint: 'furniture home' },
  { name: 'Meubles', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Meubles', dataAiHint: 'household furniture' },
  { name: 'Maison et Jardin', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Maison%20et%20Jardin', dataAiHint: 'home garden' },
  { name: 'Santé et Beauté', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Santé%20et%20Beauté', dataAiHint: 'health beauty' },
  { name: 'Bébés et Enfants', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Bébés%20et%20Enfants', dataAiHint: 'baby kids' },
  { name: 'Sports et Plein Air', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Sports%20et%20Plein%20Air', dataAiHint: 'sports equipment' },
  { name: 'Livres, Films et Musique', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Livres%2C%20Films%20et%20Musique', dataAiHint: 'books media' },
  { name: 'Équipement et Outils', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Équipement%20et%20Outils', dataAiHint: 'tools equipment' },
  { name: 'Véhicules', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Véhicules', dataAiHint: 'vehicles cars' },
  { name: 'Autre', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Autre', dataAiHint: 'various items' },
];

export default async function HomePage() {
  let featuredItems: Item[] = [];
  try {
    featuredItems = await getItemsFromFirestore({ count: 4, query: '' });
  } catch (error) {
    console.error("Erreur lors de la récupération des articles pour la page d'accueil:", error);
  }

  return (
    <div className="space-y-4 md:space-y-6"> {/* Reduced vertical spacing further */}
      {/* New Hero Section */}
      <section className="text-center py-4 md:py-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-headline text-primary mb-2 md:mb-3">
          Votre Marché d'Occasion
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-4 md:mb-6 max-w-lg mx-auto">
          Achetez et vendez des articles uniques et donnez une seconde vie à vos objets.
        </p>
        <div className="flex flex-row gap-2 sm:gap-3 justify-center">
          <Link href="/sell" className="flex-1 max-w-[200px] sm:max-w-xs">
            <Button size="lg" variant="default" className="w-full text-sm sm:text-base">
              <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Vendre Maintenant
            </Button>
          </Link>
          <Link href="/browse" className="flex-1 max-w-[200px] sm:max-w-xs">
            <Button size="lg" variant="outline" className="w-full text-sm sm:text-base">
              <Search className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Explorer
            </Button>
          </Link>
        </div>
      </section>

      {/* Category Carousel Section */}
      <section className="mb-4 md:mb-8">
        <h2 className="text-lg sm:text-xl font-bold font-headline text-primary mb-2 md:mb-3 px-1">Explorer par Catégorie</h2>
        <CategoryCarousel categories={carouselCategories} />
      </section>

      {/* Featured Items Section */}
      {featuredItems.length > 0 && (
        <section className="py-4 md:py-6">
          <h2 className="text-xl sm:text-2xl font-bold font-headline text-center mb-4 md:mb-6 text-primary">
            Dernières trouvailles sur ReFind
          </h2>
          {/* Added gap-3 for mobile and md:gap-4 for medium screens and up */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {featuredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
           <div className="text-center mt-6 md:mt-8">
            <Link href="/browse">
              <Button variant="secondary" size="lg">Voir tous les articles</Button>
            </Link>
          </div>
        </section>
      )}

      {/* How it Works Section - App Introduction */}
      <section className="py-4 md:py-6 bg-card/30 rounded-lg"> {/* Lightly different background */}
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-3 md:gap-4 text-center">
            <div className="p-3 md:p-4 bg-background rounded-lg hover:shadow-lg transition-shadow">
              <div className="p-2 bg-primary/10 rounded-full inline-block mb-1 sm:mb-2">
                <Search className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-md sm:text-lg font-semibold font-headline mb-1">Découvrez</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Explorez des milliers d'articles uniques mis en vente par des vendeurs.
              </p>
            </div>
            <div className="p-3 md:p-4 bg-background rounded-lg hover:shadow-lg transition-shadow">
              <div className="p-2 bg-primary/10 rounded-full inline-block mb-1 sm:mb-2">
                <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-md sm:text-lg font-semibold font-headline mb-1">Vendez Facilement</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Mettez en vente vos articles en quelques clics et fixez votre prix.
              </p>
            </div>
            <div className="p-3 md:p-4 bg-background rounded-lg hover:shadow-lg transition-shadow">
               <div className="p-2 bg-primary/10 rounded-full inline-block mb-1 sm:mb-2">
                <MessageCircleHeart className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <h3 className="text-md sm:text-lg font-semibold font-headline mb-1">Connectez-vous</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Communiquez directement avec les acheteurs et vendeurs via messagerie.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
