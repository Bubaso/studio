
import { cookies } from 'next/headers';
import admin from '@/lib/firebaseAdmin';
import { getPersonalizedRecommendations } from '@/ai/flows/suggest-recommendations-flow';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getItemsFromFirestore } from '@/services/itemService';
import { ItemCategories, type Item, type ItemCategory } from '@/lib/types';
import { CategoryCarousel } from '@/components/category-carousel';
import { FeaturedItemsGrid } from '@/components/featured-items-grid';
import { HeroOnboarding } from '@/components/hero-onboarding';
import { PersonalizedRecommendations } from '@/components/personalized-recommendations';


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

async function getUserIdFromCookie(): Promise<string | null> {
    try {
        const cookieStore = cookies();
        const sessionCookie = cookieStore.get('session')?.value;
        if (sessionCookie) {
            const decodedToken = await admin.auth().verifySessionCookie(sessionCookie, true);
            return decodedToken.uid;
        }
        return null;
    } catch (error) {
        // Session cookie is invalid or expired.
        return null;
    }
}


export default async function HomePage() {
  const db = admin?.firestore();
  
  const userId = await getUserIdFromCookie();

  let recommendedItems: Item[] = [];
  if (userId) {
    recommendedItems = await getPersonalizedRecommendations(userId);
  }

  const { items: latestItems } = await getItemsFromFirestore({ pageSize: 8 });

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
    return {
      name: categoryName,
      count: itemCount,
      dataAiHint: categoryHints[categoryName] || categoryName.toLowerCase(),
      link: `/browse?category=${encodeURIComponent(categoryName)}`
    };
  });

  const categoriesWithData = await Promise.all(carouselCategoriesPromises);
  categoriesWithData.sort((a, b) => b.count - a.count);


  return (
    <div className="space-y-4 md:space-y-8">
      
      <HeroOnboarding />

      <section className="py-4 md:py-8">
        <h2 className="text-xl sm:text-2xl font-bold font-headline text-primary mb-3 md:mb-4 px-1">Explorer par Catégorie</h2>
        <CategoryCarousel categories={categoriesWithData} />
      </section>

      {recommendedItems.length > 0 ? (
        <PersonalizedRecommendations items={recommendedItems} />
      ) : (
        latestItems.length > 0 && (
          <section className="py-4 md:py-6">
            <h2 className="text-xl sm:text-2xl font-bold font-headline text-center mb-4 md:mb-6 text-primary">
              Dernières trouvailles sur JëndJaay
            </h2>
            <FeaturedItemsGrid initialItems={latestItems} />
            <div className="text-center mt-6 md:mt-8">
              <Link href="/browse">
                <Button variant="secondary" size="lg">Voir tous les articles</Button>
              </Link>
            </div>
          </section>
        )
      )}
    </div>
  );
}
