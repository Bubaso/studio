

"use client";

import type { StatusFeedItem } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import Image from 'next/image';

interface StatusCardProps {
  feedItem: StatusFeedItem;
}

export function StatusCard({ feedItem }: StatusCardProps) {
  const { user, status, item } = feedItem;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3 p-4">
        <Link href={`/profile/${user.uid}`}>
          <Avatar>
            <AvatarImage src={user.avatarUrl || undefined} alt={user.name || 'Avatar'} data-ai-hint="profil personne" />
            <AvatarFallback>{(user.name || 'U').substring(0,2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link href={`/profile/${user.uid}`} className="font-semibold hover:underline">{user.name}</Link>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(status.updatedAt), { addSuffix: true, locale: fr })}
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="whitespace-pre-wrap mb-3">{status.text}</p>
        
        {item && (
          <Link href={`/items/${item.id}`} className="block group">
            <div className="border rounded-lg flex gap-3 p-2 hover:border-primary/50 transition-colors">
              <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                <Image 
                  src={item.imageUrls[0]} 
                  alt={item.name} 
                  fill 
                  className="object-cover"
                  sizes="80px"
                  data-ai-hint="product photo"
                />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors">{item.name}</h4>
                <p className="text-md font-bold text-primary">{item.price.toLocaleString('fr-FR')} XOF</p>
              </div>
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
