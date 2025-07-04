import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ListingsDashboard } from './listings-dashboard';

interface DashboardPageProps {
  params: { locale: string };
}

export default async function DashboardPage({ params: { locale } }: DashboardPageProps) {
  setRequestLocale(locale);
  const t = await getTranslations('Dashboard');
  
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold font-headline text-primary">{t('title')}</h1>
        <p className="text-lg text-muted-foreground mt-2">
          {t('subtitle')}
        </p>
      </header>
      <ListingsDashboard />
    </div>
  );
}
