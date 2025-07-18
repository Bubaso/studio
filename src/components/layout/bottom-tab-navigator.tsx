
"use client";

import {Link, usePathname} from '@/navigation';
import { ShoppingCart, PlusCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';

export function BottomTabNavigator() {
    const pathname = usePathname();
    const locale = useLocale();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // This effect runs only on the client, after the component has mounted.
        setIsClient(true);
    }, []);

    // On the server, or before the client has mounted, don't render anything to avoid mismatch.
    if (!isClient) {
        return null;
    }

    // Hide the navigator on certain pages for a cleaner interface
    if (pathname.startsWith('/auth') || pathname.startsWith('/messages')) {
        return null;
    }

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-40">
            {/* Use a relative container to position the buttons */}
            <div className="relative h-full">
                {/* Absolutely positioned container for the buttons */}
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 flex items-start gap-16">
                    
                    {/* Jënd Button */}
                    <Link href="/browse" className="flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
                            <ShoppingCart className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">Jënd</span>
                    </Link>

                    {/* Jaay Button */}
                    <Link href="/sell" className="flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
                            <PlusCircle className="h-8 w-8 text-primary-foreground" />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">Jaay</span>
                    </Link>
                    
                </div>
            </div>
        </nav>
    );
}
