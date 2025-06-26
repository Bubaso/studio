import './globals.css';
import React from 'react';
import { Toaster } from "@/components/ui/toaster"; // Ensure Toaster is here too for global access if needed

export const metadata = {
  title: 'ReFind', // Restored original title
  description: 'Achetez et vendez des articles uniques d\'occasion.', // Restored original description
  icons: null,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="font-body"> {/* Added font-body back from globals.css theme */}
        {children}
        <Toaster /> {/* It's often good to have Toaster at the root or main app layout */}
      </body>
    </html>
  );
}
