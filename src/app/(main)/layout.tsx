
import React from 'react';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <header style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
        Simplified Header
      </header>
      <main className="flex-grow container py-8">{children}</main>
      <footer style={{ padding: '1rem', borderTop: '1px solid #eee', marginTop: 'auto' }}>
        Simplified Footer
      </footer>
    </div>
  );
}
