
import { getTranslations } from 'next-intl/server';

export default async function PrivacyPolicyPage() {
  const t = await getTranslations('PrivacyPolicyPage');

  return (
    <div className="prose dark:prose-invert max-w-4xl mx-auto py-8">
      <h1>{t('title')}</h1>
      <p>{t('lastUpdated')}</p>
      
      <h2>{t('introduction.title')}</h2>
      <p>{t('introduction.p1')}</p>
      
      <h2>{t('informationWeCollect.title')}</h2>
      <p>{t('informationWeCollect.p1')}</p>
      <ul>
        <li>{t('informationWeCollect.listItem1')}</li>
        <li>{t('informationWeCollect.listItem2')}</li>
        <li>{t('informationWeCollect.listItem3')}</li>
      </ul>
      
      <h2>{t('howWeUseInformation.title')}</h2>
      <p>{t('howWeUseInformation.p1')}</p>

      <h2>{t('sharingInformation.title')}</h2>
      <p>{t('sharingInformation.p1')}</p>

      <h2>{t('yourChoices.title')}</h2>
      <p>{t('yourChoices.p1')}</p>

      <h2>{t('contactUs.title')}</h2>
      <p>{t('contactUs.p1')}</p>
    </div>
  );
}
