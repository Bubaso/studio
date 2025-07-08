
"use client";

import Link from 'next/link';
import { ShoppingCart, Plus } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function BottomTabNavigator() {
    const t = useTranslations('HomePage');
    const pathname = usePathname();

    // Hide the navigator on certain pages for a cleaner interface
    if (pathname.startsWith('/auth') || pathname.startsWith('/messages')) {
        return null;
    }

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-40">
            {/* Use a relative container to position the buttons */}
            <div className="relative h-full">
                {/* Absolutely positioned container for the buttons */}
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 flex items-start gap-8">
                    
                    {/* Explorer Button */}
                    <Link href="/browse" className="flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-lg border-4 border-background">
                            <ShoppingCart className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">Explorer</span>
                    </Link>

                    {/* Vendre Button */}
                    <Link href="/sell" className="flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-lg border-4 border-background">
                            <Plus className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">Vendre</span>
                    </Link>
                    
                </div>
            </div>
        </nav>
    );
}
