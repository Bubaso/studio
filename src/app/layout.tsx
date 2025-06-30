import './globals.css';
import React from 'react';
import { Toaster } from "@/components/ui/toaster";

export const metadata = {
  title: 'JëndJaay',
  description: 'Achetez et vendez des articles uniques d\'occasion.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="font-body">
          {children}
          <Toaster />
      </body>
    </html>
  );
}
