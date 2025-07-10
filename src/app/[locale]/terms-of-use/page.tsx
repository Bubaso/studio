
import { getTranslations } from 'next-intl/server';

export default async function TermsOfUsePage() {
  const t = await getTranslations('TermsOfUsePage');

  return (
    <div className="prose dark:prose-invert max-w-4xl mx-auto py-8">
      <h1>{t('title')}</h1>
      <p>{t('lastUpdated')}</p>

      <h2>{t('acceptance.title')}</h2>
      <p>{t('acceptance.p1')}</p>
      
      <h2>{t('userConduct.title')}</h2>
      <p>{t('userConduct.p1')}</p>
      
      <h2>{t('listings.title')}</h2>
      <p>{t('listings.p1')}</p>

      <h2>{t('intellectualProperty.title')}</h2>
      <p>{t('intellectualProperty.p1')}</p>

      <h2>{t('disclaimers.title')}</h2>
      <p>{t('disclaimers.p1')}</p>

      <h2>{t('contactUs.title')}</h2>
      <p>{t('contactUs.p1')}</p>
    </div>
  );
}
