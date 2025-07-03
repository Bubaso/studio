import './globals.css';
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Belleza, Alegreya } from 'next/font/google';

const belleza = Belleza({
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
  variable: '--font-belleza',
});

const alegreya = Alegreya({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '700'],
  variable: '--font-alegreya',
});

export const metadata = {
  title: 'JëndJaay',
  description: 'Achetez et vendez des articles uniques d\'occasion.',
};

export default function RootLayout({
  children,
  params: {locale}
}: {
  children: React.ReactNode;
  params: {locale: string};
}) {
  return (
    <html lang={locale} className={`${belleza.variable} ${alegreya.variable}`}>
      <body className="font-body">
          {children}
          <Toaster />
      </body>
    </html>
  );
}
