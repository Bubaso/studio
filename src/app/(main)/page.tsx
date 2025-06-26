
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getItemsFromFirestore } from '@/services/itemService';
import { ItemCategories, type Item, type ItemCategory } from '@/lib/types';
import { CategoryCarousel } from '@/components/category-carousel';
import { FeaturedItemsGrid } from '@/components/featured-items-grid';
import admin from '@/lib/firebaseAdmin';
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
  const db = admin?.firestore();

  const carouselCategoriesPromises = ItemCategories.map(async (categoryName) => {
    let itemCount = 0;
    
    if (db) {
        try {
            const itemsRef = db.collection('items');
            const snapshot = await itemsRef.where('category', '==', categoryName).get();
            itemCount = snapshot.size;
        } catch (error) {
            console.error(`Error fetching count for category ${categoryName}:`, error);
        }
    }
    
    // The CategoryCarousel component will now fetch its own images.
    // We only pass the necessary data from the server.
    return {
      name: categoryName,
      count: itemCount,
      dataAiHint: categoryHints[categoryName] || categoryName.toLowerCase(),
      link: `/browse?category=${encodeURIComponent(categoryName)}`
    };
  });

  const categoriesWithData = await Promise.all(carouselCategoriesPromises);
  
  // Sort categories by item count, descending
  categoriesWithData.sort((a, b) => b.count - a.count);

  let allFetchedItems: Item[] = [];
  try {
    const { items } = await getItemsFromFirestore({ pageSize: 8 });
    allFetchedItems = items;
  } catch (error) {
    console.error("Erreur lors de la récupération des articles pour la page d'accueil:", error);
  }


  return (
    <div className="space-y-4 md:space-y-8">
      
      <HeroOnboarding />

      <section className="py-4 md:py-8">
        <h2 className="text-xl sm:text-2xl font-bold font-headline text-primary mb-3 md:mb-4 px-1">Explorer par Catégorie</h2>
        {/* Pass categories without image URLs. The component handles fetching. */}
        <CategoryCarousel categories={categoriesWithData} />
      </section>

      {allFetchedItems.length > 0 && (
        <section className="py-4 md:py-6">
          <h2 className="text-xl sm:text-2xl font-bold font-headline text-center mb-4 md:mb-6 text-primary">
            Dernières trouvailles sur ReFind
          </h2>
         <FeaturedItemsGrid initialItems={allFetchedItems} />
           <div className="text-center mt-6 md:mt-8">
            <Link href="/browse">
              <Button variant="secondary" size="lg">Voir tous les articles</Button>
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
