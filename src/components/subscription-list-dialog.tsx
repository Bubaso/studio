
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { UserProfile } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Link from "next/link";
import { Button } from "./ui/button";

interface SubscriptionListDialogProps {
  trigger: React.ReactNode;
  title: string;
  users: UserProfile[];
}

export function SubscriptionListDialog({ trigger, title, users }: SubscriptionListDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4 -mr-4">
            {users.length > 0 ? (
                 <div className="space-y-4 py-4">
                    {users.map((user) => (
                        <div key={user.uid} className="flex items-center justify-between">
                            <Link href={`/profile/${user.uid}`} className="flex items-center gap-3 group">
                                 <Avatar>
                                    <AvatarImage src={user.avatarUrl || undefined} alt={user.name || 'User'} data-ai-hint={user.dataAiHint} />
                                    <AvatarFallback>{(user.name || 'U').substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span className="font-semibold group-hover:text-primary">{user.name}</span>
                            </Link>
                             <Button asChild variant="secondary" size="sm">
                                <Link href={`/profile/${user.uid}`}>Voir</Link>
                            </Button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="py-8 text-center text-muted-foreground">Aucun utilisateur à afficher.</p>
            )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
