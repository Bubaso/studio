
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusCircle } from 'lucide-react'; // Only PlusCircle is needed
import { cn } from '@/lib/utils';

export function BottomTabNavigator() {
  const pathname = usePathname();

  // Simplified for two prominent, centered buttons as requested
  // No user auth state needed for these two specific links here

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-40 flex justify-center items-center h-20">
      <div className="flex items-center space-x-12"> {/* Increased spacing between buttons */}
        {/* Parcourir Button (Browse) */}
        <Link
          href="/browse"
          className={cn(
            'flex flex-col items-center justify-center text-center transition-colors',
            pathname === '/browse' ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          )}
        >
          <div className="p-3 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:bg-primary/80 transition-all transform hover:scale-105 active:scale-95">
            <PlusCircle className="h-7 w-7" />
          </div>
          <span className="text-xs mt-1.5">Parcourir</span>
        </Link>

        {/* Vendre Button (Sell) */}
        <Link
          href="/sell"
          className={cn(
            'flex flex-col items-center justify-center text-center transition-colors',
            pathname === '/sell' ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          )}
        >
          <div className="p-3 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 active:bg-primary/80 transition-all transform hover:scale-105 active:scale-95">
            <PlusCircle className="h-7 w-7" />
          </div>
          <span className="text-xs mt-1.5">Vendre</span>
        </Link>
      </div>
    </nav>
  );
}
