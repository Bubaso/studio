
"use client"; 

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { auth, db } from '@/lib/firebase'; 
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { sendMessage, markMessageAsRead, uploadChatImageAndGetURL, markThreadAsSeenByCurrentUser, getThreadWithDiscussedItems, getMessagesForItemInThread } from '@/services/messageService';
import type { Message, MessageThread, Item } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, ArrowLeft, Loader2, Info, ImageIcon, X, Check, CheckCheck, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ReportItemButton } from '@/components/report-item-button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

// Sub-component for the list of discussed items
const DiscussedItemsList = ({
    items,
    selectedItemId,
    onSelectItem
}: {
    items: Item[];
    selectedItemId: string | null;
    onSelectItem: (itemId: string) => void;
}) => {
    return (
        <Card className="flex h-full w-full flex-col">
            <div className="p-3 border-b">
                <h3 className="font-semibold text-lg font-headline">Articles Concernés</h3>
            </div>
            <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {items.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onSelectItem(item.id)}
                            className={cn(
                                "flex items-center gap-3 p-3 text-left w-full border-b last:border-b-0 hover:bg-muted/50 transition-colors",
                                selectedItemId === item.id ? "bg-primary/10" : ""
                            )}
                        >
                            <div className="relative h-12 w-12 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                                {item.imageUrls?.[0] && <Image src={item.imageUrls[0]} alt={item.name} fill className="object-cover" />}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="font-semibold truncate">{item.name}</p>
                                <p className="text-sm text-muted-foreground truncate">{item.price.toLocaleString('fr-FR')} XOF</p>
                            </div>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </Card>
    );
};

const MobileDiscussedItemsList = ({
    items,
    selectedItemId,
    onSelectItem
}: {
    items: Item[];
    selectedItemId: string | null;
    onSelectItem: (itemId: string) => void;
}) => (
    <div className="md:hidden p-2 border-b">
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex space-x-3">
                {items.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onSelectItem(item.id)}
                        className={cn(
                            "inline-flex flex-col items-center p-2 rounded-lg border w-28 h-28 justify-center flex-shrink-0",
                            selectedItemId === item.id ? 'border-primary bg-primary/10' : 'bg-card'
                        )}
                    >
                        <div className="relative h-12 w-12 rounded-md overflow-hidden bg-muted mb-1">
                            {item.imageUrls?.[0] && <Image src={item.imageUrls[0]} alt={item.name} fill className="object-cover" />}
                        </div>
                        <p className="text-xs font-medium truncate w-full text-center">{item.name}</p>
                    </button>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    </div>
);


export default function MessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const threadId = params.threadId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [threadInfo, setThreadInfo] = useState<MessageThread | null>(null);
  const [discussedItems, setDiscussedItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageToSend, setImageToSend] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visibleMessagesRef = useRef<Set<string>>(new Set());

  // Auth Effect
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribeAuth();
  }, []);
  
  // Thread and Items Loading Effect
  useEffect(() => {
    if (currentUser && threadId) {
        setIsLoading(true);
        getThreadWithDiscussedItems(threadId).then(data => {
            if (data?.thread && data.thread.participantIds.includes(currentUser.uid)) {
                setThreadInfo(data.thread);
                setDiscussedItems(data.items);
                // Select the item from the last message context, or the first item discussed
                const initialItem = data.items.find(i => i.id === data.thread.itemId) || data.items[0];
                setSelectedItem(initialItem || null);
            } else {
                toast({ variant: "destructive", title: "Erreur", description: "Fil de discussion non trouvé ou accès refusé." });
                router.push('/messages');
            }
        }).catch(err => {
            console.error("Error fetching thread with items:", err);
            toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger le fil de discussion." });
            router.push('/messages');
        }).finally(() => {
            setIsLoading(false);
        });
    } else if (!currentUser) {
        setIsLoading(false);
    }
  }, [threadId, currentUser, router, toast]);

  // Message Subscription Effect
  useEffect(() => {
    if (currentUser && threadId && selectedItem) {
      const unsubscribeMessages = getMessagesForItemInThread(threadId, selectedItem.id, (fetchedMessages) => {
        setMessages(fetchedMessages);
      });
      return () => {
        unsubscribeMessages();
      };
    }
  }, [threadId, selectedItem, currentUser]);

  // Scroll and Read Status Effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    
    if (!currentUser || !threadInfo || messages.length === 0) return;
    const currentUserId = currentUser.uid;
    
    // Mark the entire thread as seen whenever messages for the current item are viewed
    markThreadAsSeenByCurrentUser(threadId, currentUserId);

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const messageId = entry.target.getAttribute('data-message-id');
                const message = messages.find(m => m.id === messageId);
                if (message && message.senderId !== currentUserId && (!message.readBy || !message.readBy.includes(currentUserId))) {
                    markMessageAsRead(threadId, message.id, currentUserId);
                }
            }
        });
    }, { threshold: 0.8 });

    document.querySelectorAll('.message-item').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [messages, currentUser, threadId, threadInfo]);


  const handleImageFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { 
        toast({ variant: "destructive", title: "Fichier trop volumineux", description: "La taille maximale de l'image est de 5MB." });
        return;
      }
      setImageToSend(file);
      const objectURL = URL.createObjectURL(file);
      setImagePreview(objectURL);
    }
  };

  const clearImageAttachment = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageToSend(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };
  
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !imageToSend) || !currentUser || !threadInfo || !selectedItem) return;
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
      await sendMessage(threadInfo.id, currentUser.uid, currentUser.displayName || currentUser.email || 'Moi', newMessage.trim(), selectedItem.id, uploadedImageUrl);
      setNewMessage('');
      clearImageAttachment();
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({ variant: "destructive", title: "Erreur d'envoi", description: "Le message n'a pas pu être envoyé."});
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectItem = (itemId: string) => {
    const item = discussedItems.find(i => i.id === itemId);
    if (item && item.id !== selectedItem?.id) {
        // Clear previous messages before fetching new ones to avoid brief flicker
        setMessages([]);
        setSelectedItem(item);
    }
  };
  
  if (isLoading || !currentUser) {
    return (
        <div className="flex justify-center items-center h-[calc(100vh-200px)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (!threadInfo) {
    return (
      <div className="text-center py-10">
        <Alert variant="default" className="max-w-md mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Fil de discussion non trouvé</AlertTitle>
          <AlertDescription>Ce fil de discussion n'existe pas ou vous n'y avez pas accès.</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const otherParticipantId = threadInfo.participantIds.find(id => id !== currentUser.uid);
  const otherParticipantIndex = threadInfo.participantIds.indexOf(otherParticipantId!);
  const otherParticipantName = otherParticipantIndex !== -1 && threadInfo.participantNames[otherParticipantIndex] ? threadInfo.participantNames[otherParticipantIndex] : 'Utilisateur';
  const otherParticipantAvatar = otherParticipantIndex !== -1  && threadInfo.participantAvatars[otherParticipantIndex] ? threadInfo.participantAvatars[otherParticipantIndex] : 'https://placehold.co/100x100.png?text=?';

  return (
    <div className="flex h-[calc(100vh-10rem)] max-h-[calc(100vh-10rem)] border rounded-lg shadow-sm bg-card overflow-hidden">
        {/* Left Panel for Discussed Items (Desktop) */}
        <div className="hidden md:flex md:w-1/3 border-r">
            <DiscussedItemsList items={discussedItems} selectedItemId={selectedItem?.id || null} onSelectItem={handleSelectItem} />
        </div>

        {/* Right Panel for Chat */}
        <div className="flex-1 flex flex-col min-w-0">
            <header className="p-3 border-b flex items-center space-x-3 sticky top-0 bg-card z-10">
                <Button variant="ghost" size="icon" onClick={() => router.push('/messages')} className="mr-1" aria-label="Retour aux messages">
                <ArrowLeft className="h-5 w-5" />
                </Button>
                <Avatar className="h-10 w-10">
                <AvatarImage src={otherParticipantAvatar} alt={otherParticipantName} data-ai-hint="profil personne" />
                <AvatarFallback>{otherParticipantName.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <h2 className="text-lg font-semibold font-headline">{otherParticipantName}</h2>
                </div>
                 {selectedItem && (
                    <ReportItemButton itemId={selectedItem.id} sellerId={selectedItem.sellerId} asIcon />
                )}
            </header>

            {/* Mobile Item Selector */}
            {discussedItems.length > 0 && <MobileDiscussedItemsList items={discussedItems} selectedItemId={selectedItem?.id || null} onSelectItem={handleSelectItem} />}

            {selectedItem ? (
                 <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-background/30">
                        {messages.map((msg) => {
                            const isCurrentUserSender = msg.senderId === currentUser.uid;
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
                                    <Avatar className="h-8 w-8 self-end mb-1">
                                    <AvatarImage src={senderAvatar} alt={senderNameDisplay} data-ai-hint="profil personne" />
                                    <AvatarFallback>{senderNameDisplay.substring(0,2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div
                                    className={cn(
                                    "max-w-[70%] lg:max-w-[60%] p-2.5 rounded-lg shadow-sm",
                                    isCurrentUserSender
                                        ? "bg-primary text-primary-foreground rounded-br-none" 
                                        : "bg-muted rounded-bl-none" 
                                    )}
                                >
                                    {msg.imageUrl && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <div className="relative w-full max-w-[300px] aspect-[4/3] mb-1.5 rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-muted/50">
                                                <Image src={msg.imageUrl} alt="Pièce jointe" fill className="object-contain" data-ai-hint="message image" />
                                            </div>
                                        </DialogTrigger>
                                        <DialogContent className="w-[95vw] max-w-[1200px] h-[90vh] p-1 bg-background flex items-center justify-center">
                                            <DialogHeader><DialogTitle className="sr-only">Image en plein écran</DialogTitle></DialogHeader>
                                            <div className="relative w-full h-full">
                                            <Image src={msg.imageUrl} alt="Pièce jointe en grand" fill className="object-contain rounded-md" data-ai-hint="message image" />
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                    )}
                                    {msg.text && <p className={cn("text-sm whitespace-pre-wrap break-words", isCurrentUserSender ? "text-primary-foreground" : "text-foreground")}>{msg.text}</p>}
                                    <div className={cn("text-xs mt-1.5 flex items-center", isCurrentUserSender ? "text-primary-foreground/80 justify-end" : "text-muted-foreground/80 justify-start")}>
                                    <span>{new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isCurrentUserSender && (
                                        isSeenByOther ? <CheckCheck className="ml-1.5 h-4 w-4 text-blue-500" /> : <Check className={cn("ml-1.5 h-4 w-4 opacity-70", isCurrentUserSender ? "text-primary-foreground/90" : "text-foreground")} />
                                    )}
                                    </div>
                                </div>
                                {isCurrentUserSender && (
                                    <Avatar className="h-8 w-8 self-end mb-1"> 
                                    <AvatarImage src={currentUser.photoURL || undefined} alt="Vous" data-ai-hint="profil personne" />
                                    <AvatarFallback>{(currentUser.displayName || "M").substring(0,1).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                )}
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <footer className="p-3 border-t bg-card sticky bottom-0 z-10">
                        {imagePreview && (
                        <div className="mb-2 p-2 border rounded-md bg-muted/50 relative w-24 h-24">
                            <Image src={imagePreview} alt="Aperçu" fill className="object-cover rounded-md" />
                            <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 z-10" onClick={clearImageAttachment} aria-label="Retirer l'image">
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
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-background/30">
                    <Package className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">Sélectionnez un article</h3>
                    <p className="text-muted-foreground">Veuillez sélectionner un article ci-dessus pour voir la conversation.</p>
                </div>
            )}
        </div>
    </div>
  );
}
