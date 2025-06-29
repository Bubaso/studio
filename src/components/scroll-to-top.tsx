
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // This will scroll the window to the top on a route change
    window.scrollTo(0, 0);
  }, [pathname]); // Dependency array ensures this runs only when the pathname changes

  return null; // This component doesn't render anything
}
