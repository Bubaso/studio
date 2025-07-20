
import ProfilePageClient from './ProfilePageClient';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider, useMessages } from 'next-intl';

interface ProfilePageProps {
  params: { locale: string };
}

// This page now simply acts as a wrapper that sets the locale
// and renders the client component which will handle its own data fetching.
export default function ProfilePage({ params: { locale } }: ProfilePageProps) {
  unstable_setRequestLocale(locale);
  const messages = useMessages();

  return (
    <NextIntlClientProvider messages={messages}>
        <ProfilePageClient />
    </NextIntlClientProvider>
  );
}
