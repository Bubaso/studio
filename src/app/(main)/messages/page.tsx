import Link from 'next/link';
import { getMockMessageThreads, getMockCurrentUser } from '@/lib/mock-data';
import type { MessageThread } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function MessagesPage() {
  const currentUser = await getMockCurrentUser();

  if (!currentUser) {
    return (
      <div className="text-center py-10">
        <Alert variant="default" className="max-w-md mx-auto">
          <Info className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Please <Link href="/auth/signin" className="underline hover:text-primary">sign in</Link> to view your messages.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const threads: MessageThread[] = await getMockMessageThreads(currentUser.id);

  const getOtherParticipant = (thread: MessageThread) => {
    const otherParticipantIndex = thread.participantIds.findIndex(id => id !== currentUser.id);
    return {
      name: thread.participantNames[otherParticipantIndex] || 'Unknown User',
      avatar: thread.participantAvatars[otherParticipantIndex] || 'https://placehold.co/100x100.png?text=?',
      dataAiHint: "profile person"
    };
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold font-headline text-primary">Your Messages</h1>
        <Link href="/messages/new">
          <Button variant="outline">
            <MessageSquarePlus className="mr-2 h-4 w-4" /> New Message
          </Button>
        </Link>
      </div>

      {threads.length > 0 ? (
        <div className="space-y-4">
          {threads.map((thread) => {
            const otherParticipant = getOtherParticipant(thread);
            return (
            <Link key={thread.id} href={`/messages/${thread.id}`} className="block">
              <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
                <CardContent className="p-4 flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={otherParticipant.avatar} alt={otherParticipant.name} data-ai-hint={otherParticipant.dataAiHint as string} />
                    <AvatarFallback>{otherParticipant.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{otherParticipant.name}</p>
                    {thread.lastMessage && (
                      <p className={`text-sm truncate ${thread.unreadCount && thread.unreadCount > 0 ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                        {thread.lastMessage.senderId === currentUser.id ? "You: " : ""}
                        {thread.lastMessage.text}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {thread.lastMessageAt && new Date(thread.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {thread.unreadCount && thread.unreadCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-primary-foreground bg-primary rounded-full">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          )})}
        </div>
      ) : (
        <Card>
          <CardContent className="p-10 text-center">
            <MessageSquarePlus className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No messages yet</h3>
            <p className="text-muted-foreground">Start a conversation by contacting a seller or responding to an inquiry.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
