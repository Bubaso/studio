
import { ListingForm } from '@/components/listing-form';

export default function SellPage() {
  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold font-headline text-primary">Vendez votre article</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Listez facilement vos articles d'occasion et touchez des milliers d'acheteurs potentiels.
        </p>
      </header>
      <ListingForm />
    </div>
  );
}
