
import React from 'react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from "@/components/ui/toaster";
import { BottomTabNavigator } from '@/components/layout/bottom-tab-navigator';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-0">
        {/* DIAGNOSTIC MARKER START */}
        <div style={{ border: '2px solid red', padding: '10px', margin: '10px 0' }}>
          <h1 style={{ color: 'red', fontSize: '1.5rem', fontWeight: 'bold' }}>
            ANA İÇERİK BURADA BAŞLAMALI (MainLayout Marker)
          </h1>
        </div>
        {/* DIAGNOSTIC MARKER END */}
        {children}
      </main>
      <Footer />
      <BottomTabNavigator />
      <Toaster />
    </div>
  );
}
