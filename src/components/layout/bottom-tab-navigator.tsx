
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlusCircle, ShoppingCart } from 'lucide-react'; // Added ShoppingCart
import { cn } from '@/lib/utils';

export function BottomTabNavigator() {
  const pathname = usePathname();

  // Navigation bar height is h-16 (64px)
  // Circular buttons are approx 60px diameter.
  // -mt-8 (negative margin of 32px) will make the top 32px of the button appear above the bar's top border.
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-40 flex justify-around items-center h-16 px-2 sm:px-4">
      {/* Explorer Button (Browse/Acheter) */}
      <Link
        href="/browse"
        className={cn(
          'flex flex-col items-center text-center transition-colors pt-1',
          pathname === '/browse' || pathname.startsWith('/items/') ? 'text-primary' : 'text-muted-foreground hover:text-primary' // Highlight if on browse or item detail
        )}
      >
        {/* Circular button part that notches over the bar */}
        <div className="relative -mt-8 mb-1 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-150 ease-out hover:bg-primary/90 active:scale-95 hover:shadow-xl">
          <ShoppingCart className="h-7 w-7" />
        </div>
        <span className="text-xs">Explorer</span>
      </Link>

      {/* Vendre Button (Sell) */}
      <Link
        href="/sell"
        className={cn(
          'flex flex-col items-center text-center transition-colors pt-1',
          pathname === '/sell' ? 'text-primary' : 'text-muted-foreground hover:text-primary'
        )}
      >
        {/* Circular button part that notches over the bar */}
        <div className="relative -mt-8 mb-1 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-150 ease-out hover:bg-primary/90 active:scale-95 hover:shadow-xl">
          <PlusCircle className="h-7 w-7" />
        </div>
        <span className="text-xs">Vendre</span>
      </Link>
    </nav>
  );
}

