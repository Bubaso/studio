
import './globals.css';
import React from 'react';

export const metadata = {
  title: 'ReFind - Simplified',
  description: 'Simplified ReFind App for Debugging.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        {children}
        {/* Toaster removed for simplification */}
      </body>
    </html>
  );
}
