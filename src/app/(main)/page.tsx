import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getItemsFromFirestore } from '@/services/itemService';
import { ItemCategories, type Item, type ItemCategory } from '@/lib/types';
import { CategoryCarousel } from '@/components/category-carousel';
import { FeaturedItemsGrid } from '@/components/featured-items-grid';
import { Search, ShoppingBag, MessageCircleHeart } from 'lucide-react';
import admin from '@/lib/firebaseAdmin';
import { HeroOnboarding } from '@/components/hero-onboarding';

// Admin SDK Storage bucket'ını almak için yardımcı fonksiyon
const getStorageBucket = () => {
  if (admin) {
    return admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  }
  return null;
};


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
  const bucket = getStorageBucket();

  // Kategori URL'lerini asenkron olarak ve güvenli bir şekilde al
  const carouselCategoriesPromises = ItemCategories.map(async (categoryName) => {
    let imageUrl = `https://placehold.co/400x300.png?text=${encodeURIComponent(categoryName)}`; // Varsayılan placeholder
    
    if (bucket) {
      const imageName = `${categoryName}.png`;
      const filePath = `category-images/${imageName}`;
      const file = bucket.file(filePath);

      try {
        // Dosyanın var olup olmadığını kontrol et
        const [exists] = await file.exists();
        if (exists) {
          // Varsa, herkese açık URL'sini al
          imageUrl = file.publicUrl();
        } else {
            console.warn(`Category image not found in Storage: ${filePath}`);
        }
      } catch (error) {
        console.error(`Error fetching public URL for ${filePath}:`, error);
      }
    }
    
    return {
      name: categoryName,
      dataAiHint: categoryHints[categoryName] || categoryName.toLowerCase(),
      imageUrl: imageUrl,
      link: `/browse?category=${encodeURIComponent(categoryName)}`
    };
  });

  const carouselCategories = await Promise.all(carouselCategoriesPromises);
  
  let allFetchedItems: Item[] = [];

  try {
    const { items } = await getItemsFromFirestore({
      pageSize: 8,
    });
    allFetchedItems = items;
  } catch (error) {
    console.error("Erreur lors de la récupération des articles pour la page d'accueil:", error);
  }

  return (
    <div className="space-y-4 md:space-y-8">
      
      <HeroOnboarding />

      <section className="py-4 md:py-8">
        <h2 className="text-xl sm:text-2xl font-bold font-headline text-primary mb-3 md:mb-4 px-1">Explorer par Catégorie</h2>
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

      <section className="py-4 md:py-6 bg-card/30 rounded-lg">
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
