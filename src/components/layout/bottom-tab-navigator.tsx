
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Heart, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth'; // Using a hook for easier auth state management

const navItems = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/browse', label: 'Parcourir', icon: Search },
  { href: '/sell', label: 'Vendre', icon: PlusCircle },
  { href: '/favorites', label: 'Favoris', icon: Heart, requiresAuth: true },
  { href: '/profile', label: 'Profil', icon: UserIcon, requiresAuth: true },
];

export function BottomTabNavigator() {
  const pathname = usePathname();
  const [user, loading] = useAuthState(auth); // Get auth state

  if (loading) {
    // Optionally return a slim loader or null if you don't want to show anything during auth check
    return null; 
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-md z-40">
      <ul className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          // If item requires auth and user is not logged in, don't render it
          // Or, render it and let the page handle redirect (current approach for Favorites/Profile)
          // For this example, let's keep them and rely on page-level auth checks.
          // If you want to hide them: if (item.requiresAuth && !user) return null;

          const isActive = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-md transition-colors w-full h-full',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                )}
              >
                <item.icon className={cn('h-6 w-6 mb-0.5', isActive ? "stroke-[2.5px]" : "")} />
                <span className={cn('text-xs', isActive ? 'font-semibold' : 'font-normal')}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
