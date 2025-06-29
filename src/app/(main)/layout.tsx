
import React from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from "@/components/ui/toaster";
import { BottomTabNavigator } from '@/components/layout/bottom-tab-navigator';
import { UserActivityLogger } from '@/components/user-activity-logger';
import { AuthProvider } from '@/context/AuthContext';
import { ScrollToTop } from '@/components/scroll-to-top';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
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
      </div>
    </AuthProvider>
  );
}
