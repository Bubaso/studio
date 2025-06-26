
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getItemsFromFirestore } from '@/services/itemService';
import { ItemCategories, type Item, type ItemCategory } from '@/lib/types';
import { CategoryCarousel } from '@/components/category-carousel';
import { FeaturedItemsGrid } from '@/components/featured-items-grid';
import admin from '@/lib/firebaseAdmin';
import { HeroOnboarding } from '@/components/hero-onboarding';
import type { File } from '@google-cloud/storage';


// Admin SDK Storage bucket'ını almak için yardımcı fonksiyon
const getStorageBucket = () => {
  if (admin) {
    // Ensure the bucket name is provided in environment variables
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (bucketName) {
      return admin.storage().bucket(bucketName);
    }
    console.warn("Firebase Admin: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set. Storage operations will be disabled.");
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
  const db = admin?.firestore();

  // 1. Fetch all category image files and create a lookup map.
  // This is more robust than checking for each file individually.
  const categoryImageMap = new Map<string, File>();
  if (bucket) {
    try {
      const [files] = await bucket.getFiles({ prefix: 'category-images/' });
      files.forEach(file => {
        // Normalize the filename to create a key, e.g., "category-images/Vêtements et Accessoires.png" -> "vêtements et accessoires"
        const key = file.name
          .replace('category-images/', '')
          .replace(/\.(png|jpg|jpeg|webp)$/i, '') // Handle multiple extensions
          .toLowerCase();
        
        if (key) { // Ensure we don't add the folder itself as a key
           categoryImageMap.set(key, file);
        }
      });
    } catch (error) {
      console.error("Error listing category images from Storage:", error);
    }
  }

  // 2. Map over our app's categories, get their item counts, and find their corresponding image from the map.
  const carouselCategoriesPromises = ItemCategories.map(async (categoryName) => {
    let itemCount = 0;
    let signedUrl = '';

    // Fetch item count from Firestore
    if (db) {
        try {
            const itemsRef = db.collection('items');
            // Use get() for promises, not onSnapshot
            const snapshot = await itemsRef.where('category', '==', categoryName).get();
            itemCount = snapshot.size;
        } catch (error) {
            console.error(`Error fetching count for category ${categoryName}:`, error);
        }
    }

    // Find the image file from our map using a normalized key
    const imageFile = categoryImageMap.get(categoryName.toLowerCase());

    if (imageFile) {
      try {
        // Generate a temporary URL for the image
        const [url] = await imageFile.getSignedUrl({
          action: 'read',
          expires: Date.now() + 1000 * 60 * 60, // 1 hour expiry
        });
        signedUrl = url;
      } catch (error) {
        console.error(`Error generating signed URL for ${imageFile.name}:`, error);
      }
    }
    
    return {
      name: categoryName,
      count: itemCount,
      dataAiHint: categoryHints[categoryName] || categoryName.toLowerCase(),
      imageUrl: signedUrl,
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
