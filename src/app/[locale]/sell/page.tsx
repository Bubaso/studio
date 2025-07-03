
import { ListingForm } from '@/components/listing-form';
import { getTranslations } from 'next-intl/server';

export default async function SellPage() {
  const t = await getTranslations('SellPage');
  return (
    <div className="space-y-8">
      <header className="text-center">
        <h1 className="text-3xl font-bold font-headline text-primary">{t('title')}</h1>
        <p className="text-lg text-muted-foreground mt-2">
          {t('subtitle')}
        </p>
      </header>
      <ListingForm />
    </div>
  );
}
