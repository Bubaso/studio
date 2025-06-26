import { Button } from '@/components/ui/button';
import Link from 'next/link';
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
  let allFetchedItems: Item[] = [];
  const categoryImageMap = new Map<string, string>();
  const categoryHintMap = new Map<string, string>();

  if (db) {
    try {
      // Fetch a larger batch of recent items to find category images and populate the featured grid
      const itemsSnapshot = await db.collection('items')
                                    .where('isSold', '==', false)
                                    .orderBy('postedDate', 'desc')
                                    .limit(50) // Fetch more items to increase chances of finding one for each category
                                    .get();
      
      allFetchedItems = itemsSnapshot.docs.map(doc => {
          const data = doc.data();
          const postDate = data.postedDate ? data.postedDate.toDate() : new Date();
          const now = new Date();
          const ageInDays = (now.getTime() - postDate.getTime()) / (1000 * 3600 * 24);

          const lowActivity = ageInDays > 45 && (data.price % 7 !== 0);

          let imageUrls: string[] = ['https://placehold.co/600x400.png'];
          if (Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
            imageUrls = data.imageUrls;
          } else if (typeof data.imageUrl === 'string') {
            imageUrls = [data.imageUrl];
          }
          
          const itemCategory = data.category || 'Autre';
          // If we haven't found an image for this category yet, use this item's image
          if (!categoryImageMap.has(itemCategory) && imageUrls[0]) {
              categoryImageMap.set(itemCategory, imageUrls[0]);
              // Also store the AI hint for the image
              if(data.dataAiHint) {
                categoryHintMap.set(itemCategory, data.dataAiHint);
              }
          }

          return {
            id: doc.id,
            name: data.name || '',
            description: data.description || '',
            price: data.price || 0,
            category: itemCategory,
            location: data.location || '',
            latitude: data.latitude,
            longitude: data.longitude,
            imageUrls: imageUrls,
            videoUrl: data.videoUrl,
            sellerId: data.sellerId || 'unknown',
            sellerName: data.sellerName || 'Vendeur inconnu',
            postedDate: postDate.toISOString(),
            condition: data.condition,
            dataAiHint: data.dataAiHint,
            lastUpdated: data.lastUpdated ? data.lastUpdated.toDate().toISOString() : undefined,
            suspectedSold: data.suspectedSold || false,
            lowActivity: lowActivity,
            isSold: data.isSold || false,
            soldAt: data.soldAt ? data.soldAt.toDate().toISOString() : undefined,
          } as Item;
      });
    } catch (error) {
      console.error("Erreur lors de la récupération des articles pour la page d'accueil:", error);
    }
  }
  
  // Now, build the categories for the carousel using the images we found
  const carouselCategories = ItemCategories.map((categoryName) => {
    const imageUrl = categoryImageMap.get(categoryName) || `https://placehold.co/400x300.png?text=${encodeURIComponent(categoryName)}`;
    const dataAiHint = categoryHintMap.get(categoryName) || categoryHints[categoryName] || categoryName.toLowerCase();
    
    return {
        name: categoryName,
        imageUrl: imageUrl,
        dataAiHint: dataAiHint,
        link: `/browse?category=${encodeURIComponent(categoryName)}`,
    };
  });
  
  // We only want to show a limited number of items in the grid
  const featuredItems = allFetchedItems.slice(0, 8);

  return (
    <div className="space-y-4 md:space-y-8">
      
      <HeroOnboarding />

      <section className="py-4 md:py-8">
        <h2 className="text-xl sm:text-2xl font-bold font-headline text-primary mb-3 md:mb-4 px-1">Explorer par Catégorie</h2>
        <CategoryCarousel categories={carouselCategories} />
      </section>

      {featuredItems.length > 0 && (
        <section className="py-4 md:py-6">
          <h2 className="text-xl sm:text-2xl font-bold font-headline text-center mb-4 md:mb-6 text-primary">
            Dernières trouvailles sur ReFind
          </h2>
         <FeaturedItemsGrid initialItems={featuredItems} maxItems={8} />
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
