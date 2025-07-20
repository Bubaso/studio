
"use client";

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Gem } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function PromotionalModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const tNotifier = useTranslations('FoundingMemberNotifier');

  useEffect(() => {
    if (searchParams.get('new_founding_member') === 'true') {
      // Use a timeout to ensure the toast appears after the page has settled from the redirect
      const timer = setTimeout(() => {
        toast({
            title: (
                <div className="flex items-center gap-2">
                <Gem className="h-5 w-5 text-primary" />
                {tNotifier('title')}
                </div>
            ),
            description: tNotifier('description'),
            className: 'text-base',
            duration: 20000,
        });

        // Clean up the URL by removing the query parameter
        // This prevents the toast from showing again on page refresh
        const newPath = pathname.split('?')[0];
        router.replace(newPath, { scroll: false });

      }, 500); // 500ms delay

      return () => clearTimeout(timer);
    }
  }, [searchParams, pathname, router, toast, tNotifier]);


  // This component no longer renders a visible modal, it just handles the toast logic.
  return null;
}
