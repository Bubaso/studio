
import React from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from "@/components/ui/toaster";
import { BottomTabNavigator } from '@/components/layout/bottom-tab-navigator'; // Import new component

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-16 md:mb-0">{children}</main> {/* Added mb-16 for mobile to avoid overlap with bottom nav */}
      <Footer />
      <BottomTabNavigator /> {/* Add the bottom tab navigator */}
      <Toaster />
    </div>
  );
}
