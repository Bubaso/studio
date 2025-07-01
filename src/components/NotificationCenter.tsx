
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, Loader2, Package, UserPlus, CheckCheck } from 'lucide-react';
import { markAllNotificationsAsRead } from '@/services/notificationService';
import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Notification } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

function NotificationItem({ notification }: { notification: Notification }) {
    const getIcon = () => {
        switch (notification.type) {
            case 'new_item': return <Package className="h-4 w-4 text-primary" />;
            case 'new_subscriber': return <UserPlus className="h-4 w-4 text-green-500" />;
            default: return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };
    const getLink = () => {
        if(notification.itemId) return `/items/${notification.itemId}`;
        if(notification.relatedUserId) return `/profile/${notification.relatedUserId}`;
        return '#';
    }

    const getText = () => {
        if (notification.type === 'new_item') {
            return <><strong>{notification.relatedUserName}</strong> a publié un nouvel article : <strong>{notification.itemName}</strong></>;
        }
        if (notification.type === 'new_subscriber') {
            return <><strong>{notification.relatedUserName}</strong> s'est abonné à votre profil.</>;
        }
        return "Nouvelle notification";
    }

    return (
        <Link href={getLink()} className="block hover:bg-muted/50 rounded-md p-3 transition-colors">
            <div className="flex items-start gap-3">
                <div className="relative mt-1">
                     <Avatar className="h-9 w-9">
                        <AvatarImage src={notification.relatedUserAvatar} alt={notification.relatedUserName} />
                        <AvatarFallback>{notification.relatedUserName?.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-background p-0.5 rounded-full">{getIcon()}</div>
                </div>
                <div className="flex-1">
                    <p className="text-sm">{getText()}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: fr })}</p>
                </div>
                {!notification.isRead && <div className="h-2.5 w-2.5 bg-primary rounded-full mt-1 flex-shrink-0" />}
            </div>
        </Link>
    )
}

export function NotificationCenter() {
  const { firebaseUser, authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isMarking, startMarkingTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (!firebaseUser) {
      setNotifications([]);
      setHasUnread(false);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const notificationsRef = collection(db, 'users', firebaseUser.uid, 'notifications');
    const q = query(notificationsRef, orderBy('createdAt', 'desc'), limit(15));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications: Notification[] = [];
      snapshot.forEach(doc => {
          const data = doc.data();
          newNotifications.push({
              id: doc.id,
              createdAt: data.createdAt?.toDate().toISOString(),
              ...data
          } as Notification)
      });
      
      setNotifications(newNotifications);
      setHasUnread(newNotifications.some(n => !n.isRead));
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [firebaseUser]);
  
  const handleMarkAllRead = () => {
      if(!firebaseUser || !hasUnread) return;
      startMarkingTransition(async () => {
          const result = await markAllNotificationsAsRead(firebaseUser.uid);
          if(!result.success) {
              toast({title: "Erreur", description: "Impossible de marquer les notifications comme lues.", variant: "destructive"});
          }
      });
  }

  if (authLoading) return null;
  if (!firebaseUser) return null;

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-primary rounded-full border-2 border-background" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            {hasUnread && (
                 <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={isMarking}>
                    {isMarking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4 mr-2"/>}
                    Tout marquer comme lu
                </Button>
            )}
        </div>
        <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </div>
            ) : notifications.length > 0 ? (
                notifications.map(n => <NotificationItem key={n.id} notification={n} />)
            ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                    Vous n'avez aucune notification.
                </div>
            )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
