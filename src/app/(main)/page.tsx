
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ItemCard } from '@/components/item-card';
import { getItemsFromFirestore } from '@/services/itemService';
import type { Item, ItemCategory } from '@/lib/types'; // ItemCategory import edildi
import { CategoryCarousel } from '@/components/category-carousel';
import { Search, ShoppingBag, MessageCircleHeart, PlusCircle } from 'lucide-react'; // PlusCircle import edildi

// Mevcut ItemCategories'den örnek kategoriler seçelim
const carouselCategories = [
  { name: 'Électronique', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Électronique', dataAiHint: 'electronics gadgets' },
  { name: 'Vêtements et Accessoires', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Vêtements%20et%20Accessoires', dataAiHint: 'fashion clothing' },
  { name: 'Mobilier', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Mobilier', dataAiHint: 'furniture home' },
  { name: 'Maison et Jardin', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Maison%20et%20Jardin', dataAiHint: 'home garden' },
  { name: 'Sports et Plein Air', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Sports%20et%20Plein%20Air', dataAiHint: 'sports equipment' },
  { name: 'Livres, Films et Musique', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Livres%2C%20Films%20et%20Musique', dataAiHint: 'books media' },
  { name: 'Véhicules', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Véhicules', dataAiHint: 'vehicles cars' },
  { name: 'Autre', imageUrl: 'https://placehold.co/400x300.png', link: '/browse?category=Autre', dataAiHint: 'various items' },
];

export default async function HomePage() {
  let featuredItems: Item[] = [];
  try {
    // Öne çıkan ürün sayısını 4'e düşürelim, mobil ve masaüstünde daha iyi görünmesi için
    featuredItems = await getItemsFromFirestore({ count: 4, query: '' });
  } catch (error) {
    console.error("Erreur lors de la récupération des articles pour la page d'accueil:", error);
  }

  return (
    <div className="space-y-6 md:space-y-8"> {/* Dikey boşluk azaltıldı */}
      {/* New Hero Section */}
      <section className="text-center py-6 md:py-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-headline text-primary mb-3 md:mb-4">
          Votre Marché d'Occasion
        </h1>
        <p className="text-md sm:text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-xl mx-auto">
          Achetez et vendez des articles uniques et donnez une seconde vie à vos objets.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link href="/sell">
            <Button size="lg" variant="default" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> Vendre Maintenant
            </Button>
          </Link>
          <Link href="/browse">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              <Search className="mr-2 h-5 w-5" /> Explorer les Articles
            </Button>
          </Link>
        </div>
      </section>

      {/* Category Carousel Section */}
      <section className="mb-6 md:mb-10">
        <h2 className="text-xl sm:text-2xl font-bold font-headline text-primary mb-3 md:mb-4 px-1">Explorer par Catégorie</h2>
        <CategoryCarousel categories={carouselCategories} />
      </section>

      {/* Featured Items Section */}
      {featuredItems.length > 0 && (
        <section className="py-6 md:py-8">
          <h2 className="text-2xl sm:text-3xl font-bold font-headline text-center mb-6 md:mb-8 text-primary">
            Dernières trouvailles sur ReFind
          </h2>
          {/* Mobil için 2 sütun, daha büyük ekranlar için 3 veya 4 sütun */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
           <div className="text-center mt-8 md:mt-10">
            <Link href="/browse">
              <Button variant="secondary" size="lg">Voir tous les articles</Button>
            </Link>
          </div>
        </section>
      )}

      {/* How it Works Section - App Introduction */}
      <section className="py-6 md:py-8 bg-card/50 rounded-lg">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-4 md:gap-6 text-center">
            <div className="p-4 md:p-6 bg-background rounded-lg hover:shadow-xl transition-shadow">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-full inline-block mb-2 sm:mb-3">
                <Search className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold font-headline mb-1">Découvrez</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Explorez des milliers d'articles uniques mis en vente par des vendeurs de votre communauté et d'ailleurs.
              </p>
            </div>
            <div className="p-4 md:p-6 bg-background rounded-lg hover:shadow-xl transition-shadow">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-full inline-block mb-2 sm:mb-3">
                <ShoppingBag className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold font-headline mb-1">Vendez Facilement</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Mettez en vente vos articles en quelques clics. Ajoutez des photos, une description et fixez votre prix.
              </p>
            </div>
            <div className="p-4 md:p-6 bg-background rounded-lg hover:shadow-xl transition-shadow">
               <div className="p-2 sm:p-3 bg-primary/10 rounded-full inline-block mb-2 sm:mb-3">
                <MessageCircleHeart className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold font-headline mb-1">Connectez-vous</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Communiquez directement avec les acheteurs et vendeurs via notre messagerie sécurisée.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
