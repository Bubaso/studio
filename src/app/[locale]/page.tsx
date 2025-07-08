
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { getItemsFromFirestore } from '@/services/itemService';
import { ItemCategories, type Item, type ItemCategory } from '@/lib/types';
import { CategoryCarousel } from '@/components/category-carousel';
import { FeaturedItemsGrid } from '@/components/featured-items-grid';
import { HeroOnboarding } from '@/components/hero-onboarding';
import { PersonalizedContent } from '@/components/personalized-content';
import admin from '@/lib/firebaseAdmin';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HomeStatusFeed } from '@/components/home-status-feed';


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

// This page is now fully static on the server.
// The dynamic, personalized parts are loaded on the client in PersonalizedContent.
export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations('HomePage');
  const db = admin?.firestore();

  // Fetch data that does not depend on the user
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

      <HomeStatusFeed />

      <section className="py-4 md:py-8">
        <h2 className="text-xl sm:text-2xl font-bold font-headline text-primary mb-3 md:mb-4 px-1">{t('exploreByCategory')}</h2>
        <CategoryCarousel categories={categoriesWithData} />
      </section>

      {/* This component now only shows recommendations or latest items */}
      <PersonalizedContent latestItems={latestItems} />
      
    </div>
  );
}
