
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getItemsFromFirestore } from '@/services/itemService';
import { ItemCategories, type Item, type ItemCategory } from '@/lib/types';
import { CategoryCarousel } from '@/components/category-carousel';
import { FeaturedItemsGrid } from '@/components/featured-items-grid';
import admin from '@/lib/firebaseAdmin';
import { HeroOnboarding } from '@/components/hero-onboarding';

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

  // Kategori URL'lerini ve ilan sayılarını asenkron olarak al
  const carouselCategoriesPromises = ItemCategories.map(async (categoryName) => {
    let itemCount = 0;
    let signedUrl = ''; // Default to empty string for the image URL

    // Her zaman ilan sayısını al
    if (db) {
        try {
            const itemsRef = db.collection('items');
            const q = itemsRef.where('category', '==', categoryName);
            const snapshot = await q.get();
            itemCount = snapshot.size;
        } catch (error) {
            console.error(`Error fetching count for category ${categoryName}:`, error);
            itemCount = 0; 
        }
    }

    // Storage'dan görsel URL'sini almayı dene
    if (bucket) {
      const imageName = `${categoryName}.png`;
      const filePath = `category-images/${imageName}`;
      const file = bucket.file(filePath);

      try {
        const [exists] = await file.exists();
        if (exists) {
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
            
            [signedUrl] = await file.getSignedUrl({
              action: 'read',
              expires: oneYearFromNow,
            });
        } else {
             console.warn(`Category image not found in Storage for: ${filePath}. Category will be shown without an image.`);
        }
      } catch (error) {
        console.error(`Error checking or fetching signed URL for ${filePath}:`, error);
        // Hata durumunda signedUrl boş kalır
      }
    }
    
    // Kategoriyi her zaman döndür, görseli olmasa bile
    return {
      name: categoryName,
      count: itemCount,
      dataAiHint: categoryHints[categoryName] || categoryName.toLowerCase(),
      imageUrl: signedUrl, // Bulunamazsa boş olacak
      link: `/browse?category=${encodeURIComponent(categoryName)}`
    };
  });

  const categoriesWithData = await Promise.all(carouselCategoriesPromises);
  
  // Kategorileri ilan sayısına göre büyükten küçüğe doğru sırala
  categoriesWithData.sort((a, b) => b.count - a.count);

  let allFetchedItems: Item[] = [];

  try {
    // This call uses the client SDK service, which is fine for a server component
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
        <CategoryCarousel categories={categoriesWithData} />
      </section>

      {allFetchedItems.length > 0 && (
        <section className="py-4 md:py-6">
          <h2 className="text-xl sm:text-2xl font-bold font-headline text-center mb-4 md:mb-6 text-primary">
            Dernières trouvailles sur ReFind
          </h2>
         <FeaturedItemsGrid initialItems={allFetchedItems} maxItems={8} />
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
