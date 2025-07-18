
import ProfilePageClient from './ProfilePageClient';
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, unstable_setRequestLocale} from 'next-intl/server';

interface ProfilePageProps {
  params: { locale: string };
}

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params: { locale } }: ProfilePageProps) {
  unstable_setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ProfilePageClient />
    </NextIntlClientProvider>
  );
}
