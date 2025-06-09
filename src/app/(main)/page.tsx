
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ItemCard } from '@/components/item-card';
import { getItemsFromFirestore } from '@/services/itemService';
import type { Item } from '@/lib/types';
import { ShoppingBag, Search, MessageCircleHeart, Sparkles } from 'lucide-react';

export default async function HomePage() {
  let featuredItems: Item[] = [];
  try {
    // Récupérer les 4 articles les plus récents pour les afficher
    featuredItems = await getItemsFromFirestore({ count: 4, query: '' }); // Added empty query to satisfy type if needed
  } catch (error) {
    console.error("Erreur lors de la récupération des articles pour la page d'accueil:", error);
    // Gérer l'erreur gracieusement, par exemple en n'affichant aucun article ou un message
  }

  return (
    <div className="space-y-12 md:space-y-16">
      {/* Hero Section */}
      <section className="text-center py-10 md:py-16 bg-gradient-to-br from-card to-background rounded-xl shadow-xl overflow-hidden">
        <div className="container mx-auto px-4">
          <ShoppingBag className="h-16 w-16 md:h-20 md:w-20 text-primary mx-auto mb-5 animate-pulse" />
          <h1 className="text-3xl sm:text-4xl font-bold font-headline text-primary mb-3">
            ReFind : Votre Marché d'Occasion de Confiance
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-7">
            Découvrez des trésors uniques, vendez facilement les articles dont vous n'avez plus besoin et rejoignez une communauté passionnée par la seconde main.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/browse">
              <Button size="lg" className="font-semibold text-base px-6 py-3 shadow-md hover:shadow-lg transition-shadow">
                <Search className="mr-2 h-5 w-5" /> Explorer les Articles
              </Button>
            </Link>
            <Link href="/sell">
              <Button size="lg" variant="outline" className="font-semibold text-base px-6 py-3 shadow-md hover:shadow-lg transition-shadow">
                Commencer à Vendre
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Items Section */}
      {featuredItems.length > 0 && (
        <section>
          <div className="flex items-center justify-center mb-7">
            <Sparkles className="h-6 w-6 text-amber-500 mr-2" />
            <h2 className="text-2xl md:text-3xl font-bold font-headline text-center">
              Dernières trouvailles sur ReFind
            </h2>
            <Sparkles className="h-6 w-6 text-amber-500 ml-2" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
            {featuredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
           <div className="text-center mt-9">
            <Link href="/browse">
              <Button variant="secondary" size="lg" className="font-semibold">Voir tous les articles</Button>
            </Link>
          </div>
        </section>
      )}

      {/* How it Works Section - App Introduction */}
      <section className="py-10 md:py-14 bg-card rounded-xl shadow-lg">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold font-headline text-center mb-8">Comment ça marche ?</h2>
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 text-center">
            <div className="p-5 border border-border/50 rounded-lg hover:shadow-xl transition-shadow bg-background">
              <div className="p-3 bg-primary/10 rounded-full inline-block mb-3">
                <Search className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1.5 font-headline">1. Découvrez</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Explorez des milliers d'articles uniques mis en vente par des vendeurs de votre communauté et d'ailleurs. Utilisez nos filtres pour affiner votre recherche.
              </p>
            </div>
            <div className="p-5 border border-border/50 rounded-lg hover:shadow-xl transition-shadow bg-background">
              <div className="p-3 bg-primary/10 rounded-full inline-block mb-3">
                <ShoppingBag className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1.5 font-headline">2. Vendez Facilement</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Mettez en vente vos articles en quelques clics. Ajoutez des photos de qualité, une description détaillée et fixez votre prix. C'est simple et rapide !
              </p>
            </div>
            <div className="p-5 border border-border/50 rounded-lg hover:shadow-xl transition-shadow bg-background">
               <div className="p-3 bg-primary/10 rounded-full inline-block mb-3">
                <MessageCircleHeart className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1.5 font-headline">3. Connectez-vous</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Communiquez directement avec les acheteurs et vendeurs via notre messagerie sécurisée pour finaliser vos transactions en toute confiance.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
