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
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-4">
                {/* Jënd Button */}
                <Button
                    asChild
                    className="h-14 w-28 rounded-full shadow-lg font-headline text-lg"
                >
                    <Link href="/browse">
                        <ShoppingBag className="mr-2 h-5 w-5" />
                        Jënd
                    </Link>
                </Button>

                {/* Jaay Button */}
                <Button
                    asChild
                    className="h-14 w-28 rounded-full shadow-lg font-headline text-lg"
                >
                    <Link href="/sell">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Jaay
                    </Link>
                </Button>
            </div>
        </nav>
    );
}
