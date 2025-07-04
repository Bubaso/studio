
import React from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from "@/components/ui/toaster";
import { BottomTabNavigator } from '@/components/layout/bottom-tab-navigator';
import { UserActivityLogger } from '@/components/user-activity-logger';
import { AuthProvider } from '@/context/AuthContext';
import { ScrollToTop } from '@/components/scroll-to-top';
import { FoundingMemberNotifier } from '@/components/FoundingMemberNotifier';
import {NextIntlClientProvider, useMessages} from 'next-intl';
import { unstable_setRequestLocale } from 'next-intl/server';
import { Chatbot } from '@/components/chatbot';

export default function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  const locale = params.locale;
  unstable_setRequestLocale(locale);
  const messages = useMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <AuthProvider>
        <FoundingMemberNotifier />
        <ScrollToTop />
        <div className="flex flex-col min-h-screen">
          <Header />
          <UserActivityLogger />
          <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-0">
            {children}
          </main>
          <Footer />
          <BottomTabNavigator />
          <Toaster />
          <Chatbot />
        </div>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
