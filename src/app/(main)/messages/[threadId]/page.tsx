
"use client"; 

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { getMessagesForThread, sendMessage, getThreadInfoById, markMessageAsRead, uploadChatImageAndGetURL } from '@/services/messageService';
import type { Message, MessageThread, Item } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, ArrowLeft, Loader2, Info, Paperclip, Check, CheckCheck, Image as ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


export default function MessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const threadId = params.threadId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [threadInfo, setThreadInfo] = useState<MessageThread | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingThreadInfo, setIsLoadingThreadInfo] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageToSend, setImageToSend] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visibleMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
      if (!user) {
         setIsLoadingThreadInfo(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);
  
  useEffect(() => {
    if (currentUser && threadId) {
      setIsLoadingThreadInfo(true);
      getThreadInfoById(threadId).then(info => {
        setThreadInfo(info);
        setIsLoadingThreadInfo(false);
        if (!info) {
          console.warn("Fil de discussion non trouvé ou l'utilisateur n'est pas un participant.");
          toast({ variant: "destructive", title: "Erreur", description: "Fil de discussion non trouvé." });
          router.push('/messages');
        }
      });

      const unsubscribeMessages = getMessagesForThread(threadId, (fetchedMessages) => {
        setMessages(fetchedMessages);
      });
      
      return () => {
        unsubscribeMessages();
      };
    } else if (!currentUser && !isLoadingAuth) {
        setIsLoadingThreadInfo(false);
    }
  }, [threadId, currentUser, isLoadingAuth, toast, router]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    if (!currentUser || !threadId || messages.length === 0) return;

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const messageId = entry.target.getAttribute('data-message-id');
          const senderId = entry.target.getAttribute('data-sender-id');
          if (messageId && senderId === otherParticipantId && !visibleMessagesRef.current.has(messageId)) {
            const message = messages.find(m => m.id === messageId);
            if (message && (!message.readBy || !message.readBy.includes(currentUser.uid))) {
              markMessageAsRead(threadId, messageId, currentUser.uid);
              visibleMessagesRef.current.add(messageId); 
            }
          }
        }
      });
    };

    intersectionObserverRef.current = new IntersectionObserver(observerCallback, { threshold: 0.5 });
    const currentObserver = intersectionObserverRef.current;

    document.querySelectorAll('.message-item').forEach(el => currentObserver.observe(el));

    return () => {
      currentObserver.disconnect();
      visibleMessagesRef.current.clear();
    };
  }, [messages, currentUser, threadId, // Add otherParticipantId as dependency if available early
     // Ensure otherParticipantId is stable or this effect re-runs correctly
     threadInfo?.participantIds.find(id => id !== currentUser?.uid) 
    ]);


  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ variant: "destructive", title: "Fichier trop volumineux", description: "La taille maximale de l'image est de 5MB." });
        return;
      }
      setImageToSend(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImageAttachment = () => {
    setImageToSend(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input
    }
  };
  
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !imageToSend) || !currentUser || !threadInfo) return;
    setIsSending(true);
    let uploadedImageUrl: string | undefined = undefined;

    if (imageToSend) {
      setIsUploadingImage(true);
      try {
        uploadedImageUrl = await uploadChatImageAndGetURL(imageToSend, threadInfo.id, currentUser.uid);
      } catch (error) {
        console.error("Failed to upload image:", error);
        toast({ variant: "destructive", title: "Erreur de téléversement", description: "L'image n'a pas pu être envoyée."});
        setIsSending(false);
        setIsUploadingImage(false);
        return;
      } finally {
        setIsUploadingImage(false);
      }
    }

    try {
      await sendMessage(threadInfo.id, currentUser.uid, currentUser.displayName || currentUser.email || 'Moi', newMessage.trim(), uploadedImageUrl);
      setNewMessage('');
      clearImageAttachment();
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({ variant: "destructive", title: "Erreur d'envoi", description: "Le message n'a pas pu être envoyé."});
    } finally {
      setIsSending(false);
    }
  };
  
  if (isLoadingAuth || isLoadingThreadInfo) {
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentUser) {
     return (
      <div className="text-center py-10">
        <Alert variant="default" className="max-w-md mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Accès refusé</AlertTitle>
          <AlertDescription>
            Veuillez <Link href={`/auth/signin?redirect=/messages/${threadId}`} className="underline hover:text-primary">vous connecter</Link> pour voir ce fil de discussion.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!threadInfo) {
    // This case should ideally be handled by the redirect in useEffect, but as a fallback:
    return <div className="text-center py-10">Fil de discussion non trouvé ou vous n'y avez pas accès. Redirection...</div>;
  }
  
  const otherParticipantId = threadInfo.participantIds.find(id => id !== currentUser.id);
  const otherParticipantIndex = threadInfo.participantIds.indexOf(otherParticipantId!);
  const otherParticipantName = otherParticipantIndex !== -1 ? threadInfo.participantNames[otherParticipantIndex] : 'Utilisateur';
  const otherParticipantAvatar = otherParticipantIndex !== -1 ? threadInfo.participantAvatars[otherParticipantIndex] : 'https://placehold.co/100x100.png?text=?';

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[calc(100vh-10rem)] border rounded-lg shadow-sm bg-card">
      <header className="p-3 border-b flex items-center space-x-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/messages')} className="mr-1" aria-label="Retour aux messages">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherParticipantAvatar} alt={otherParticipantName} data-ai-hint="profil personne" />
          <AvatarFallback>{otherParticipantName.substring(0,2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <h2 className="text-lg font-semibold font-headline">{otherParticipantName}</h2>
            {threadInfo.itemTitle && threadInfo.itemId && (
                 <Link href={`/items/${threadInfo.itemId}`} className="text-xs text-muted-foreground hover:text-primary flex items-center">
                    {threadInfo.itemImageUrl && (
                        <Image src={threadInfo.itemImageUrl} alt={threadInfo.itemTitle} width={20} height={20} className="object-cover rounded mr-1.5" data-ai-hint="produit vente" />
                    )}
                   <span>Discussion à propos de: <span className="font-medium">{threadInfo.itemTitle}</span></span>
                 </Link>
            )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => {
          const isCurrentUserSender = msg.senderId === currentUser.id;
          const senderAvatar = isCurrentUserSender ? (currentUser.photoURL || undefined) : otherParticipantAvatar;
          const senderNameDisplay = isCurrentUserSender ? "Vous" : msg.senderName;
          const isSeenByOther = isCurrentUserSender && otherParticipantId && msg.readBy?.includes(otherParticipantId);
          
          return (
            <div 
              key={msg.id} 
              className={cn("flex items-end space-x-2 message-item", isCurrentUserSender ? "justify-end" : "justify-start")}
              data-message-id={msg.id}
              data-sender-id={msg.senderId}
            >
              {!isCurrentUserSender && (
                <Avatar className="h-8 w-8 self-end">
                  <AvatarImage src={senderAvatar} alt={senderNameDisplay} data-ai-hint="profil personne" />
                  <AvatarFallback>{senderNameDisplay.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-[70%] lg:max-w-[60%] p-2.5 rounded-lg shadow",
                  isCurrentUserSender
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-secondary text-secondary-foreground rounded-bl-none"
                )}
              >
                {msg.imageUrl && (
                   <Dialog>
                    <DialogTrigger asChild>
                        <div className="relative aspect-video max-h-64 w-auto mb-1.5 rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                        <Image src={msg.imageUrl} alt="Pièce jointe" fill className="object-contain" data-ai-hint="message image" />
                        </div>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl p-2">
                        <DialogHeader className="sr-only"><DialogTitle>Aperçu de l'image</DialogTitle></DialogHeader>
                        <Image src={msg.imageUrl} alt="Pièce jointe en grand" width={1200} height={800} className="object-contain rounded-md max-h-[80vh] w-auto mx-auto" data-ai-hint="message image" />
                    </DialogContent>
                   </Dialog>
                )}
                {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                <div className={cn("text-xs mt-1.5 flex items-center", isCurrentUserSender ? "text-primary-foreground/70 justify-end" : "text-muted-foreground/80")}>
                  <span>{new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  {isCurrentUserSender && (
                    isSeenByOther ? <CheckCheck className="ml-1.5 h-4 w-4 text-blue-300" /> : <Check className="ml-1.5 h-4 w-4 text-primary-foreground/60" />
                  )}
                </div>
              </div>
               {isCurrentUserSender && (
                <Avatar className="h-8 w-8 self-end">
                  <AvatarImage src={senderAvatar} alt={senderNameDisplay} data-ai-hint="profil personne" />
                  <AvatarFallback>{(currentUser.displayName || "V").substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-3 border-t">
        {imagePreview && (
          <div className="mb-2 p-2 border rounded-md bg-muted/50 relative w-24 h-24">
            <Image src={imagePreview} alt="Aperçu" fill className="object-cover rounded-md" />
            <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 z-10" onClick={clearImageAttachment}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageFileChange} className="hidden" />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage || isSending || !!imageToSend} aria-label="Joindre une image">
            {isUploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
          </Button>
          <Textarea
            placeholder="Écrivez votre message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            rows={1}
            className="flex-1 resize-none min-h-[40px]"
            disabled={isSending || isUploadingImage}
          />
          <Button onClick={handleSendMessage} disabled={isSending || isUploadingImage || (!newMessage.trim() && !imageToSend)} aria-label="Envoyer le message">
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Envoyer</span>
          </Button>
        </div>
      </footer>
    </div>
  );
}

