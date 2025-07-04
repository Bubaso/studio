"use client";

import { useState, useRef, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Loader2, MessageCircle, Send, Sparkles } from 'lucide-react';
import { askChatbot } from '@/ai/flows/chatbot-flow';
import type { Item } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ItemCard } from './item-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  text: string;
  items?: Item[];
}

export function Chatbot() {
  const t = useTranslations('Chatbot');
  const locale = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to the bottom every time messages or pending state changes
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isPending) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      text: input,
    };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput(''); // Clear input immediately for better UX

    startTransition(async () => {
      try {
        const response = await askChatbot({ query: currentInput, locale });
        const botMessage: ChatMessage = {
          id: Date.now() + 1,
          role: 'bot',
          text: response.answer,
          items: response.items,
        };
        setMessages(prev => [...prev, botMessage]);
      } catch (error) {
        console.error("Error asking chatbot:", error);
        const errorMessage: ChatMessage = {
          id: Date.now() + 1,
          role: 'bot',
          text: t('generalError'),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    });
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                    <Button
                    variant="default"
                    className="fixed right-6 bottom-28 md:bottom-6 h-16 w-16 rounded-full shadow-lg z-50 flex items-center justify-center"
                    aria-label={t('triggerTooltip')}
                    >
                    <MessageCircle className="h-8 w-8" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-full max-w-md flex flex-col p-0">
                    <SheetHeader className="p-4 border-b text-left">
                    <SheetTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {t('title')}
                    </SheetTitle>
                    </SheetHeader>
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-4 space-y-4">
                            {messages.map(message => (
                                <div
                                key={message.id}
                                className={cn(
                                    "flex items-start gap-3 w-full",
                                    message.role === 'user' ? "justify-end" : "justify-start"
                                )}
                                >
                                {message.role === 'bot' && (
                                    <Avatar className="h-8 w-8 border">
                                        <AvatarFallback><Sparkles className="h-4 w-4" /></AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn(
                                    "rounded-lg p-3 max-w-[85%]",
                                    message.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}>
                                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                    {message.items && message.items.length > 0 && (
                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                            {message.items.map(item => (
                                                <ItemCard key={item.id} item={item} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                                </div>
                            ))}
                            {isPending && (
                                <div className="flex items-start gap-3">
                                <Avatar className="h-8 w-8 border">
                                    <AvatarFallback><Sparkles className="h-4 w-4" /></AvatarFallback>
                                </Avatar>
                                <div className="rounded-lg p-3 bg-muted flex items-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                                </div>
                            )}
                             <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>
                    </div>
                    <div className="p-4 border-t bg-background">
                        <form onSubmit={handleSubmit} className="flex items-center gap-2">
                            <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={t('placeholder')}
                            disabled={isPending}
                            className="flex-1"
                            />
                            <Button type="submit" disabled={isPending || !input.trim()} size="icon">
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </form>
                    </div>
                </SheetContent>
              </Sheet>
            </TooltipTrigger>
            <TooltipContent side="left" className="mr-2">
                <p>{t('triggerTooltip')}</p>
            </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
