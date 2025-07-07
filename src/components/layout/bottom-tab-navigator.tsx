

"use client";

import { usePathname } from 'next/navigation';
import { PlusCircle, ShoppingCart } from 'lucide-react'; // Added ShoppingCart
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function BottomTabNavigator() {
  const t = useTranslations('Header.nav');
  const pathname = usePathname();

  const navItems = [
    { href: '/browse', label: t('browse'), icon: <ShoppingCart className="h-7 w-7" />, activePaths: ['/browse', '/items/'] },
    { href: '/sell', label: t('sell'), icon: <PlusCircle className="h-7 w-7" />, activePaths: ['/sell'] },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-40 grid grid-cols-2 items-center h-16 px-2 sm:px-4">
      {navItems.map(item => {
        const isActive = item.activePaths.some(path => pathname.startsWith(path));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center text-center transition-colors h-full',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
            )}
          >
            {item.icon}
            <span className="text-xs font-medium mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
