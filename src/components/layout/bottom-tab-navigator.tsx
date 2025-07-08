
"use client";

import { usePathname } from 'next/navigation';
import { Home, Heart, PlusCircle, MessageSquare, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export function BottomTabNavigator() {
  const pathname = usePathname();
  const { firebaseUser } = useAuth();
  
  const profileHref = firebaseUser ? '/profile' : '/auth/signin';

  const navItems = [
    { name: 'browse', href: '/browse', label: 'Jënd', icon: <Home className="h-6 w-6" /> },
    { name: 'favorites', href: '/favorites', label: 'Favoris', icon: <Heart className="h-6 w-6" /> },
    { name: 'sell', href: '/sell', label: 'Jaay', icon: <PlusCircle className="h-8 w-8" />, isCentral: true },
    { name: 'messages', href: '/messages', label: 'Messages', icon: <MessageSquare className="h-6 w-6" /> },
    { name: 'profile', href: profileHref, label: 'Profil', icon: <User className="h-6 w-6" /> }
  ];

  const getIsActive = (itemName: string) => {
    // This function checks the current path to determine which nav item is active.
    // It's designed to correctly highlight parent routes (e.g., 'browse' is active for '/items/[id]').
    switch (itemName) {
      case 'browse':
        return pathname === '/' || pathname.startsWith('/browse') || pathname.startsWith('/items');
      case 'favorites':
        return pathname.startsWith('/favorites');
      case 'sell':
        return pathname.startsWith('/sell');
      case 'messages':
        return pathname.startsWith('/messages');
      case 'profile':
        return pathname.startsWith('/profile') || pathname.startsWith('/auth');
      default:
        return false;
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-40 flex justify-around items-center h-16 px-2 sm:px-4">
      {navItems.map((item) => {
        const isActive = getIsActive(item.name);
        
        if (item.isCentral) {
          return (
            <Link href={item.href} key={item.href} className="-mt-6 z-10">
                <Button
                    variant="default"
                    size="icon"
                    className="h-14 w-14 rounded-full shadow-lg"
                    aria-label={item.label}
                >
                    {item.icon}
                </Button>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center text-center transition-colors w-full h-full',
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
