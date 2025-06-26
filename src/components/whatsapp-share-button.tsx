'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Item } from '@/lib/types';
import { cn } from '@/lib/utils';

const WhatsAppIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 fill-current">
        <title>WhatsApp</title>
        <path d="M12.04 2.015c-5.524 0-10 4.478-10 10.002 0 1.75.45 3.415 1.256 4.863L2.07 22.07l5.247-1.372a9.962 9.962 0 0 0 4.72 1.21h.005c5.524 0 10-4.478 10-10.002s-4.476-10-10-10.002zM12.04 20.116h-.005a8.144 8.144 0 0 1-4.155-1.18l-.297-.176-3.085.807.82-3.013-.194-.31a8.14 0 0 1-1.27-4.382c0-4.512 3.655-8.17 8.168-8.17s8.167 3.657 8.167 8.17c0 4.513-3.655 8.17-8.168 8.17zm4.49-5.838c-.247-.124-1.46-.718-1.688-.802-.227-.082-.392-.123-.556.124-.164.246-.638.802-.782.966-.144.164-.288.184-.535.062-.247-.124-.96-.35-1.83-1.125-.678-.598-1.14-1.334-1.275-1.562-.134-.228-.014-.35.11-.474.11-.11.247-.288.37-.432.124-.144.164-.246.246-.41.082-.164.04-.308-.02-.432-.06-.124-.556-1.34-.763-1.838-.207-.498-.415-.43-.557-.438-.144-.008-.308-.008-.473-.008a.892.892 0 0 0-.64.308c-.207.228-.782.763-.782 1.854s.8 2.148.922 2.312c.124.164 1.562 2.38 3.79 3.326.54.232.96.37 1.284.473.535.164 1.02.144 1.406.082.43-.072 1.265-.515 1.442-1.012.178-.498.178-.926.124-1.012-.05-.082-.174-.134-.42-.258z"></path>
    </svg>
);


interface WhatsAppShareButtonProps {
  item: Item;
  className?: string;
}

export function WhatsAppShareButton({ item, className }: WhatsAppShareButtonProps) {
  const isMobile = useIsMobile();
  const [shareUrl, setShareUrl] = React.useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const text = `Salut ! J'ai vu cette annonce sur ReFind :\n\n*${item.name}* - ${item.price.toLocaleString('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0 })}\n\nJette un œil : ${window.location.href}`;
      const encodedText = encodeURIComponent(text);
      setShareUrl(`https://wa.me/?text=${encodedText}`);
    }
  }, [item]);

  if (isMobile === undefined || !isMobile) {
    return null;
  }

  return (
    <Button asChild variant="outline" className={cn("bg-green-500 hover:bg-green-600 text-white hover:text-white border-green-600", className)}>
      <a href={shareUrl} target="_blank" rel="noopener noreferrer" aria-label="Partager sur WhatsApp">
        <WhatsAppIcon />
        <span>Partager</span>
      </a>
    </Button>
  );
}
