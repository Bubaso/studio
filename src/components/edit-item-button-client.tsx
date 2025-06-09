
"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Edit3, Loader2 } from 'lucide-react';

interface EditItemButtonClientProps {
  sellerId: string;
  itemId: string;
}

export function EditItemButtonClient({ sellerId, itemId }: EditItemButtonClientProps) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoadingAuth) {
    return (
      <Button size="lg" variant="secondary" className="w-full sm:w-auto flex-1" disabled>
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Modifier
      </Button>
    );
  }

  if (currentUser && currentUser.uid === sellerId) {
    return (
      <Link href={`/items/${itemId}/edit`} passHref legacyBehavior>
        <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto flex-1">
          <a><Edit3 className="mr-2 h-5 w-5" /> Modifier l'annonce</a>
        </Button>
      </Link>
    );
  }

  return null; 
}
