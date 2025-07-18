
import ProfilePageClient from './ProfilePageClient';
import {NextIntlClientProvider, useMessages} from 'next-intl';
import {pick} from 'lodash';

export const dynamic = 'force-dynamic';

// This is now a Server Component that ensures the route is handled dynamically.
export default function ProfilePage() {
  const messages = useMessages();
  // We can add server-side logic here in the future if needed.
  return (
    <NextIntlClientProvider messages={pick(messages, 'ProfilePage', 'SubscriptionDialog')}>
      <ProfilePageClient />
    </NextIntlClientProvider>
  );
}
