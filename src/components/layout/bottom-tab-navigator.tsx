
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, PlusCircle } from 'lucide-react'; // Changed Home to Search
import { cn } from '@/lib/utils';

export function BottomTabNavigator() {
  const pathname = usePathname();

  // Navigation bar height is h-16 (64px)
  // Circular buttons are approx 60px diameter.
  // -mt-8 (negative margin of 32px) will make the top 32px of the button appear above the bar's top border.
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-40 flex justify-center items-center h-16">
      {/* Container for the buttons, using items-start for alignment before negative margin pulls circles up */}
      <div className="flex items-start space-x-12">

        {/* Parcourir Button (Browse/Acheter) */}
        <Link
          href="/browse"
          className={cn(
            'flex flex-col items-center text-center transition-colors',
            pathname === '/browse' ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          )}
        >
          {/* Circular button part that notches over the bar */}
          <div className="relative -mt-8 mb-1.5 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-150 ease-out hover:bg-primary/90 active:scale-95 hover:shadow-xl">
            <Search className="h-7 w-7" />
          </div>
          <span className="text-xs">Parcourir</span>
        </Link>

        {/* Vendre Button (Sell) */}
        <Link
          href="/sell"
          className={cn(
            'flex flex-col items-center text-center transition-colors',
            pathname === '/sell' ? 'text-primary' : 'text-muted-foreground hover:text-primary'
          )}
        >
          {/* Circular button part that notches over the bar */}
          <div className="relative -mt-8 mb-1.5 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-150 ease-out hover:bg-primary/90 active:scale-95 hover:shadow-xl">
            <PlusCircle className="h-7 w-7" />
          </div>
          <span className="text-xs">Vendre</span>
        </Link>
      </div>
    </nav>
  );
}
