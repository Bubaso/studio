
"use client";

import { ShoppingBag, UserPlus, Mail, Lock, Loader2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase"; 
import { createUserWithEmailAndPassword, onAuthStateChanged, type User as FirebaseUser, GoogleAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
import { createUserAction, type SerializableUser } from "@/actions/userActions";
import Link from 'next/link';
import { useLocale, useTranslations } from "next-intl";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const GoogleIcon = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
    <path
      d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 1.98-4.52 1.98-5.45 0-9.88-4.45-9.88-9.88s4.43-9.88 9.88-9.88c2.92 0 4.96 1.18 6.48 2.62l-2.35 2.35c-.96-.91-2.2-1.98-4.13-1.98-3.3 0-5.98 2.67-5.98 5.98s2.67 5.98 5.98 5.98c3.67 0 5.14-2.5 5.46-3.92h-5.46z"
      fill="currentColor"
    />
  </svg>
);


function SignUpPageContent() {
  const t = useTranslations('SignUpPage');
  const tSignIn = useTranslations('SignInPage');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        toast({ title: t('toast.errorTitle'), description: t('toast.weakPassword'), variant: "destructive" });
        return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: name });
      
      const serializableUser: SerializableUser = {
          uid: user.uid,
          email: user.email,
          displayName: name,
          photoURL: user.photoURL,
      };

      const creationResult = await createUserAction(serializableUser, { name }, locale);
      if (!creationResult.success) {
        throw new Error(creationResult.error || t('toast.genericError'));
      }

      toast({ title: t('toast.successTitle'), description: t('toast.welcome', { name }) });
      
      const destination = creationResult.isFoundingMember ? `${redirectTo}?new_founding_member=true` : redirectTo;
      router.push(destination);

    } catch (error: any) {
      setIsLoading(false);
      let errorMessage = t('toast.genericError');
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = t('toast.emailInUse');
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = t('toast.invalidEmail');
      } else if (error.message) {
          errorMessage = error.message;
      }
      toast({ title: t('toast.errorTitle'), description: errorMessage, variant: "destructive" });
    }
  };

  const handleOAuthSignIn = async (provider: GoogleAuthProvider) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const serializableUser: SerializableUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
      };

      const creationResult = await createUserAction(serializableUser, {
        name: user.displayName,
        avatarUrl: user.photoURL,
      }, locale);

      if (!creationResult.success) {
        throw new Error(creationResult.error || tSignIn('toast.oauthErrorTitle'));
      }

      toast({
        title: tSignIn('toast.successTitle'),
        description: tSignIn('toast.welcome', { name: user.displayName || user.email }),
      });
      
      const destination = creationResult.isFoundingMember ? `${redirectTo}?new_founding_member=true` : redirectTo;
      router.push(destination);

    } catch (error: any) {
      setIsLoading(false);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return; 
      }
      
      console.error("OAuth Sign-up Error:", error);
      let errorMessage = tSignIn('toast.oauthErrorTitle');
       if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = tSignIn('toast.oauthAccountExists');
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = tSignIn('toast.unauthorizedDomain');
      } else if (error.message) {
          errorMessage = error.message;
      }
      toast({
        title: tSignIn('toast.oauthErrorTitle'),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
      
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ShoppingBag className="h-12 w-12 text-primary animate-pulse" />
        <p className="ml-4">{tSignIn('verifyingSession')}</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <Link href="/" className="inline-block mx-auto mb-4">
          <ShoppingBag className="h-12 w-12 text-primary" />
        </Link>
        <CardTitle className="text-3xl font-headline">{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
        <p className="text-sm text-muted-foreground pt-2">
          {t('hasAccountPrompt')}{" "}
          <Link href={`/auth/signin?redirect=${encodeURIComponent(redirectTo)}`} className="font-semibold text-primary hover:underline">
             {t('signInLink')}
          </Link>
        </p>
      </CardHeader>
      <CardContent>
         <div className="space-y-3">
            <Button
              variant="default"
              className="w-full h-14 text-lg"
              onClick={() => handleOAuthSignIn(googleProvider)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {t('googleSignUp')}
            </Button>
          </div>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-muted-foreground/30"></div>
          <span className="mx-4 text-xs text-muted-foreground">{t('orSeparator')}</span>
          <div className="flex-grow border-t border-muted-foreground/30"></div>
        </div>
        
        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
           <div className="space-y-2">
            <Label htmlFor="name">{t('nameLabel')}</Label>
            <div className="relative">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder={t('namePlaceholder')}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('emailLabel')}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('passwordLabel')}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="pl-10"
              />
            </div>
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {t('signUpButton')}
          </Button>
        </form>

      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 pt-6">
         <p className="text-sm text-muted-foreground">
           {t('hasAccountPrompt')}{" "}
          <Link href={`/auth/signin?redirect=${encodeURIComponent(redirectTo)}`} className="font-semibold text-primary hover:underline">
             {t('signInLink')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}


function LoadingFallback() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <ShoppingBag className="h-12 w-12 text-primary animate-pulse" />
        </div>
    );
}

export default function SignUpPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <SignUpPageContent />
        </Suspense>
    );
}
