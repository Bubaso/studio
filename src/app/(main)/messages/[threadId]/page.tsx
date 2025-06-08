"use client"; // This page needs client-side interactions for sending messages

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getMockMessagesForThread, getMockMessageThreads, getMockCurrentUser, addMockMessage } from '@/lib/mock-data';
import type { Message, MessageThread, User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, ArrowLeft, Loader2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function MessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const threadId = params.threadId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [threadInfo, setThreadInfo] = useState<MessageThread | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const user = await getMockCurrentUser();
      setCurrentUser(user);

      if (!user) {
        router.push('/auth/signin'); // Redirect if not logged in
        return;
      }

      // In a real app, you'd fetch thread info and messages together or ensure thread info exists
      // For mock, fetch all threads and find the current one to get participant info
      const allThreads = await getMockMessageThreads(user.id);
      const currentThread = allThreads.find(t => t.id === threadId);
      setThreadInfo(currentThread || null);
      
      if (currentThread) {
        const fetchedMessages = await getMockMessagesForThread(threadId);
        setMessages(fetchedMessages);
      } else {
        // Handle case where thread doesn't exist or user isn't part of it
        console.warn("Thread not found or user not a participant.");
      }
      setIsLoading(false);
    }
    fetchData();
  }, [threadId, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !threadInfo) return;
    setIsSending(true);
    const messageData = {
      threadId: threadInfo.id,
      senderId: currentUser.id,
      senderName: currentUser.name, // Denormalized for mock convenience
      text: newMessage.trim(),
    };
    const sentMessage = await addMockMessage(messageData);
    setMessages(prev => [...prev, sentMessage]);
    setNewMessage('');
    setIsSending(false);
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-[calc(100vh-200px)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentUser) {
     return (
      <div className="text-center py-10">
        <Alert variant="default" className="max-w-md mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Please <Link href="/auth/signin" className="underline hover:text-primary">sign in</Link> to view this message thread.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!threadInfo) {
    return <div className="text-center py-10">Thread not found or you do not have access.</div>;
  }
  
  const otherParticipantIndex = threadInfo.participantIds.findIndex(id => id !== currentUser.id);
  const otherParticipantName = threadInfo.participantNames[otherParticipantIndex] || 'User';
  const otherParticipantAvatar = threadInfo.participantAvatars[otherParticipantIndex] || 'https://placehold.co/100x100.png?text=?';

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-h-[calc(100vh-10rem)] border rounded-lg shadow-sm bg-card">
      <header className="p-4 border-b flex items-center space-x-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar>
          <AvatarImage src={otherParticipantAvatar} alt={otherParticipantName} data-ai-hint="profile person" />
          <AvatarFallback>{otherParticipantName.substring(0,2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <h2 className="text-xl font-semibold font-headline">{otherParticipantName}</h2>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isCurrentUserSender = msg.senderId === currentUser.id;
          const senderAvatar = isCurrentUserSender ? currentUser.avatarUrl : otherParticipantAvatar;
          const senderName = isCurrentUserSender ? "You" : msg.senderName;
          
          return (
            <div key={msg.id} className={cn("flex items-end space-x-2", isCurrentUserSender ? "justify-end" : "justify-start")}>
              {!isCurrentUserSender && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={senderAvatar} alt={senderName} data-ai-hint="profile person" />
                  <AvatarFallback>{senderName.substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  "max-w-xs lg:max-w-md p-3 rounded-lg shadow",
                  isCurrentUserSender
                    ? "bg-primary text-primary-foreground rounded-br-none"
                    : "bg-secondary text-secondary-foreground rounded-bl-none"
                )}
              >
                <p className="text-sm">{msg.text}</p>
                <p className={cn("text-xs mt-1", isCurrentUserSender ? "text-primary-foreground/70 text-right" : "text-muted-foreground/70")}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
               {isCurrentUserSender && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={senderAvatar} alt={senderName} data-ai-hint="profile person" />
                  <AvatarFallback>{senderName.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Textarea
            placeholder="Type your message..."
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
            disabled={isSending}
          />
          <Button onClick={handleSendMessage} disabled={isSending || !newMessage.trim()}>
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </footer>
    </div>
  );
}
