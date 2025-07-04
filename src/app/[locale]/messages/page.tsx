
"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { getMessageThreadsForUser, deleteThreadForUser } from '@/services/messageService';
import type { MessageThread } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquarePlus, Info, Loader2, Circle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslations } from 'next-intl';

export default function MessagesPage() {
  const t = useTranslations('MessagesPage');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
      if (!user) {
        setIsLoadingThreads(false); 
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setIsLoadingThreads(true);
      const unsubscribeThreads = getMessageThreadsForUser(currentUser.uid, (updatedThreads) => {
        setThreads(updatedThreads);
        setIsLoadingThreads(false);
      });
      return () => unsubscribeThreads();
    } else {
      setThreads([]); 
    }
  }, [currentUser]);

  const handleDeleteThread = async (threadId: string) => {
    if (!currentUser) return;
    setIsDeleting(threadId);
    try {
        await deleteThreadForUser(threadId, currentUser.uid);
        toast({ title: t('toast.threadDeletedTitle'), description: t('toast.threadDeletedDesc') });
    } catch (error) {
        toast({ variant: "destructive", title: t('toast.errorTitle'), description: t('toast.deleteError') });
        console.error("Error deleting thread:", error);
    } finally {
        setIsDeleting(null);
    }
  };

  const getOtherParticipantDetails = (thread: MessageThread) => {
    if (!currentUser) return { name: 'Utilisateur', avatar: 'https://placehold.co/100x100.png?text=?', dataAiHint: "profil personne" };
    const otherParticipantIndex = thread.participantIds.findIndex(id => id !== currentUser.uid);
    const name = otherParticipantIndex !== -1 && thread.participantNames && thread.participantNames[otherParticipantIndex] 
                 ? thread.participantNames[otherParticipantIndex] 
                 : t('unknownUser');
    const avatar = otherParticipantIndex !== -1 && thread.participantAvatars && thread.participantAvatars[otherParticipantIndex]
                   ? thread.participantAvatars[otherParticipantIndex]
                   : 'https://placehold.co/100x100.png?text=?';
    
    return {
      name,
      avatar,
      dataAiHint: "profil personne"
    };
  };

  if (isLoadingAuth) {
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">{t('loadingAuth')}</p></div>;
  }

  if (!currentUser) {
    return (
      <div className="text-center py-10">
        <Alert variant="default" className="max-w-md mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>{t('accessDeniedTitle')}</AlertTitle>
          <AlertDescription>
            {t.rich('accessDeniedDesc', {
                loginLink: (chunks) => <Link href="/auth/signin" className="underline hover:text-primary font-semibold ml-1">{chunks}</Link>
            })}
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline text-primary">{t('title')}</h1>
      </div>

      {isLoadingThreads && threads.length === 0 && (
         <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">{t('loadingThreads')}</p></div>
      )}

      {!isLoadingThreads && threads.length > 0 && (
        <div className="space-y-3">
          {threads.map((thread) => {
            const otherParticipant = getOtherParticipantDetails(thread);
            const lastMessageText = thread.lastMessageText || t('noMessagesYet');
            const isLastMessageFromCurrentUser = thread.lastMessageSenderId === currentUser.uid;
            const currentUserHasSeenLatest = thread.participantsWhoHaveSeenLatest?.includes(currentUser.uid);
            const hasUnreadMessages = !isLastMessageFromCurrentUser && !currentUserHasSeenLatest;

            const linkHref = `/messages/${thread.id}${thread.itemId ? `?item=${thread.itemId}` : ''}`;

            return (
              <Card key={thread.id} className={cn(
                  "hover:shadow-md transition-shadow hover:border-primary/50",
                  hasUnreadMessages ? "border-primary/70 bg-primary/5" : ""
              )}>
                <CardContent className="p-3 flex items-center space-x-3">
                  <Link href={linkHref} className="flex items-center space-x-3 flex-1 overflow-hidden group">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.name} data-ai-hint={otherParticipant.dataAiHint as string} />
                      <AvatarFallback>{otherParticipant.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className={cn("font-semibold text-lg truncate group-hover:text-primary", hasUnreadMessages ? "text-primary" : "")}>{otherParticipant.name}</p>
                      <p className={cn("text-sm truncate", hasUnreadMessages ? "text-foreground font-medium" : "text-muted-foreground")}>
                        {isLastMessageFromCurrentUser ? t('youPrefix') : ""}
                        {lastMessageText}
                      </p>
                    </div>
                  </Link>

                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end space-y-1 text-right">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(thread.lastMessageAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {hasUnreadMessages && (
                        <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          disabled={isDeleting === thread.id}
                        >
                          {isDeleting === thread.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>{t('deleteConfirmDesc')}</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteThread(thread.id)} className="bg-destructive hover:bg-destructive/90">
                            {t('delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      
      {!isLoadingThreads && threads.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center flex flex-col items-center">
            <MessageSquarePlus className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">{t('noThreadsTitle')}</h3>
            <p className="text-muted-foreground mb-6">{t('noThreadsDesc')}</p>
            <Button asChild>
                <Link href="/browse">{t('browseItems')}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
