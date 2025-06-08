import { ListingForm } from '@/components/listing-form';

export default function SellPage() {
  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold font-headline text-primary">Sell Your Item</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Easily list your pre-loved items and reach thousands of potential buyers.
        </p>
      </header>
      <ListingForm />
    </div>
  );
}
