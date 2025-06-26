import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ItemCategories, type Item, type ItemCategory } from '@/lib/types';
import { CategoryCarousel } from '@/components/category-carousel';
import { FeaturedItemsGrid } from '@/components/featured-items-grid';
import { ShoppingBag } from 'lucide-react';
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
  const db = admin?.firestore();

  // Kategori URL'lerini ve ilan sayılarını asenkron olarak al
  const carouselCategoriesPromises = ItemCategories.map(async (categoryName) => {
    let imageUrl = `https://placehold.co/400x300.png?text=${encodeURIComponent(categoryName)}`;
    let itemCount = 0;

    // İlgili kategorideki ilan sayısını Firestore'dan çek
    if (db) {
        try {
            const itemsRef = db.collection('items');
            const q = itemsRef.where('category', '==', categoryName);
            const snapshot = await q.get();
            itemCount = snapshot.size;
        } catch (error) {
            console.error(`Error fetching count for category ${categoryName}:`, error);
            itemCount = 0; // Hata durumunda sayıyı 0 olarak ayarla
        }
    }
    
    // Kategori görselini Storage'dan al
    if (bucket) {
      const imageName = `${categoryName}.png`;
      const filePath = `category-images/${imageName}`;
      const file = bucket.file(filePath);

      try {
        const [exists] = await file.exists();
        if (exists) {
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          
          const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: oneYearFromNow,
          });
          imageUrl = signedUrl;

        } else {
            console.warn(`Category image not found in Storage: ${filePath}`);
        }
      } catch (error) {
        console.error(`Error fetching signed URL for ${filePath}:`, error);
      }
    }
    
    return {
      name: categoryName,
      count: itemCount, // Sıralama için ilan sayısını ekle
      dataAiHint: categoryHints[categoryName] || categoryName.toLowerCase(),
      imageUrl: imageUrl,
      link: `/browse?category=${encodeURIComponent(categoryName)}`
    };
  });

  const categoriesWithData = await Promise.all(carouselCategoriesPromises);
  
  // Kategorileri ilan sayısına göre büyükten küçüğe doğru sırala
  categoriesWithData.sort((a, b) => b.count - a.count);

  let allFetchedItems: Item[] = [];

  if (db) {
    try {
      const itemsSnapshot = await db.collection('items')
                                    .where('isSold', '==', false)
                                    .orderBy('postedDate', 'desc')
                                    .limit(8)
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

          return {
            id: doc.id,
            name: data.name || '',
            description: data.description || '',
            price: data.price || 0,
            category: data.category || 'Autre',
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
