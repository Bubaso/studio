import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getItemsFromFirestore } from '@/services/itemService';
import { ItemCategories, type Item, type ItemCategory } from '@/lib/types';
import { CategoryCarousel } from '@/components/category-carousel';
import { FeaturedItemsGrid } from '@/components/featured-items-grid';
import { HeroOnboarding } from '@/components/hero-onboarding';

// Map categories to their AI hints for image generation
const categoryHints: { [key in ItemCategory]?: string } = {
  'Électronique': 'electronics gadgets',
  'Téléphones et Portables': 'smartphones mobiles',
  'Vêtements et Accessoires': 'fashion clothing',
  'Mobilier': 'furniture home',
  'Meubles': 'household furniture',
  'Maison et Jardin': 'home garden',
  'Santé et Beauté': 'health beauty',
  'Bébés et Enfants': 'baby kids',
  'Sports et Plein Air': 'sports equipment',
  'Livres, Films et Musique': 'books media',
  'Équipement et Outils': 'tools equipment',
  'Véhicules': 'vehicles cars',
  'Jouets et Jeux': 'toys games',
  'Objets de Collection et Art': 'collectibles art',
  'Autre': 'various items',
};


export default async function HomePage() {
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  // Dynamically create carousel categories from the master list
  const carouselCategories = ItemCategories.map(categoryName => {
    const imageName = `${categoryName}.png`;
    const encodedPath = `category-images/${encodeURIComponent(imageName)}`;
    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodedPath}?alt=media`;
    
    return {
      name: categoryName,
      dataAiHint: categoryHints[categoryName] || categoryName.toLowerCase(), // Fallback to category name if hint is missing
      imageUrl: imageUrl,
      link: `/browse?category=${encodeURIComponent(categoryName)}`
    }
  });
  
  let allFetchedItems: Item[] = [];

  try {
    // Fetch more items than needed initially, client component will filter and slice
    allFetchedItems = await getItemsFromFirestore({
      count: 8, // Fetch a bit more to allow for filtering by client component
      query: '',
      // excludeSellerId cannot be reliably determined in Server Component without server session
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des articles pour la page d'accueil:", error);
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <HeroOnboarding />

      <section className="mb-4 md:mb-8">
        <h2 className="text-lg sm:text-xl font-bold font-headline text-primary mb-2 md:mb-3 px-1">Explorer par Catégorie</h2>
        <CategoryCarousel categories={carouselCategories} />
      </section>

      {allFetchedItems.length > 0 && (
        <section className="py-4 md:py-6">
          <h2 className="text-xl sm:text-2xl font-bold font-headline text-center mb-4 md:mb-6 text-primary">
            Dernières trouvailles sur ReFind
          </h2>
         <FeaturedItemsGrid initialItems={allFetchedItems} maxItems={4} />
           <div className="text-center mt-6 md:mt-8">
            <Link href="/browse">
              <Button variant="secondary" size="lg">Voir tous les articles</Button>
            </Link>
          </div>
        </section>
      )}

      {/* The old 3-column section has been removed as its content is now in the hero carousel. */}
    </div>
  );
}
