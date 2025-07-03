import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';

export default async function AuthLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const messages = await getMessages();
  
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        {children}
      </div>
    </NextIntlClientProvider>
  );
}
