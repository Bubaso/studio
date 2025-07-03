
"use client";

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { getUserDocument } from '@/services/userService';
import type { UserProfile } from '@/lib/types';
import { ProfileEditForm } from '@/components/profile-edit-form';
import { Loader2, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';

export default function EditProfilePage() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        const profile = await getUserDocument(user.uid);
        setUserProfile(profile);
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Chargement de votre profil...</p>
      </div>
    );
  }

  if (!firebaseUser || !userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <LogIn className="h-4 w-4" />
          <AlertTitle>Accès non autorisé</AlertTitle>
          <AlertDescription>
            Vous devez être connecté pour modifier votre profil.
          </AlertDescription>
        </Alert>
        <Link href="/auth/signin" className="mt-6">
          <Button>
            <LogIn className="mr-2 h-4 w-4" /> Se connecter
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      <ProfileEditForm currentUserProfile={userProfile} />
    </div>
  );
}
