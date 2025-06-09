
"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { getMessageThreadsForUser } from '@/services/messageService';
import type { MessageThread, UserProfile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquarePlus, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
      if (!user) {
        setIsLoadingThreads(false); // No threads to load if not logged in
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
      setThreads([]); // Clear threads if user logs out
    }
  }, [currentUser]);

  const getOtherParticipantDetails = (thread: MessageThread) => {
    if (!currentUser) return { name: 'Utilisateur', avatar: 'https://placehold.co/100x100.png?text=?', dataAiHint: "profil personne" };
    const otherParticipantIndex = thread.participantIds.findIndex(id => id !== currentUser.uid);
    // Ensure indices are valid before accessing
    const name = otherParticipantIndex !== -1 && thread.participantNames && thread.participantNames[otherParticipantIndex] 
                 ? thread.participantNames[otherParticipantIndex] 
                 : 'Utilisateur Inconnu';
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
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Chargement de l'authentification...</p></div>;
  }

  if (!currentUser) {
    return (
      <div className="text-center py-10">
        <Alert variant="default" className="max-w-md mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Veuillez <Link href="/auth/signin" className="underline hover:text-primary">vous connecter</Link> pour voir vos messages.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold font-headline text-primary">Vos Messages</h1>
        {/* Temporarily removing "Nouveau Message" button as its flow needs definition for Firestore users
        <Link href="/messages/new"> 
          <Button variant="outline">
            <MessageSquarePlus className="mr-2 h-4 w-4" /> Nouveau Message
          </Button>
        </Link>
        */}
      </div>

      {isLoadingThreads && threads.length === 0 && (
         <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Chargement des fils de discussion...</p></div>
      )}

      {!isLoadingThreads && threads.length > 0 && (
        <div className="space-y-4">
          {threads.map((thread) => {
            const otherParticipant = getOtherParticipantDetails(thread);
            const lastMessageText = thread.lastMessageText || "Pas encore de messages.";
            const isLastMessageFromCurrentUser = thread.lastMessageSenderId === currentUser.uid;
            
            return (
            <Link key={thread.id} href={`/messages/${thread.id}`} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
                <CardContent className="p-4 flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.name} data-ai-hint={otherParticipant.dataAiHint as string} />
                    <AvatarFallback>{otherParticipant.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-lg truncate">{otherParticipant.name}</p>
                    <p className="text-sm truncate text-muted-foreground">
                      {isLastMessageFromCurrentUser ? "Vous : " : ""}
                      {lastMessageText}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                    {new Date(thread.lastMessageAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    {/* Unread count logic removed for simplicity for now */}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )})}
        </div>
      )}
      
      {!isLoadingThreads && threads.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center">
            <MessageSquarePlus className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">Aucun message pour le moment</h3>
            <p className="text-muted-foreground">Commencez une conversation en contactant un vendeur ou un utilisateur depuis leur profil ou une annonce.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
