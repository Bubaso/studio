"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingBag, PlusCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function BottomTabNavigator() {
    const pathname = usePathname();

    // Hide the navigator on certain pages for a cleaner interface, e.g., auth pages.
    if (pathname.startsWith('/auth') || pathname.startsWith('/messages')) {
        return null;
    }

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-12 bg-background border-t z-40">
             {/* This div creates the floating effect for the buttons */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-6">
                {/* Browse (Jënd) Button */}
                <Button
                    asChild
                    variant="default" // Use the primary color
                    className="h-16 w-16 rounded-full shadow-lg flex items-center justify-center"
                    aria-label="Parcourir les articles"
                >
                    <Link href="/browse">
                        <ShoppingBag className="h-8 w-8" />
                    </Link>
                </Button>

                {/* Sell (Jaay) Button */}
                <Button
                    asChild
                    variant="default" // Use the primary color
                    className="h-16 w-16 rounded-full shadow-lg flex items-center justify-center"
                    aria-label="Vendre un article"
                >
                    <Link href="/sell">
                        <PlusCircle className="h-8 w-8" />
                    </Link>
                </Button>
            </div>
        </nav>
    );
}
