
"use client";

import { ShoppingBag, LogIn, Mail, Lock, Loader2 } from "lucide-react";
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
import { signInWithEmailAndPassword, onAuthStateChanged, type User as FirebaseUser, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { createUserAction } from "@/actions/userActions";
import Link from 'next/link';
import { useLocale, useTranslations } from "next-intl";

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function SignInPageContent() {
  const t = useTranslations('SignInPage');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthLoading(false);
      } else {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);


  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: t('toast.successTitle'), description: t('toast.redirecting') });
      router.push(redirectTo);
    } catch (error: any) {
      let errorMessage = t('toast.genericError');
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = t('toast.invalidCredentials');
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = t('toast.invalidEmail');
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = t('toast.tooManyRequests');
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = t('toast.networkError');
      }
      toast({ title: t('toast.errorTitle'), description: errorMessage, variant: "destructive" });
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: GoogleAuthProvider) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // This action creates the user document only if it doesn't already exist.
      const creationResult = await createUserAction(user, {
        name: user.displayName,
        avatarUrl: user.photoURL,
      }, locale);
      
      if (!creationResult.success) {
        // Even if creation fails (e.g., user already exists), we can still proceed with sign-in.
        // But we should log the error for debugging.
        console.warn("User document creation might have failed, but sign-in continues. Error:", creationResult.error);
      }

      toast({
        title: t('toast.successTitle'),
        description: t('toast.welcome', { name: user.displayName || user.email }),
      });
      
      router.push(redirectTo);

    } catch (error: any) {
      setIsLoading(false);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      
      console.error("OAuth Sign-in Error:", error);
      let errorMessage = t('toast.oauthErrorTitle');
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = t('toast.oauthAccountExists');
      } else if (error.code === 'auth/unauthorized-domain') {
          errorMessage = t('toast.unauthorizedDomain');
      }
      toast({
        title: t('toast.oauthErrorTitle'),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ShoppingBag className="h-12 w-12 text-primary animate-pulse" />
        <p className="ml-4">{t('verifyingSession')}</p>
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
          {t('noAccountPrompt')}{" "}
          <Link href={`/auth/signup?redirect=${encodeURIComponent(redirectTo)}`} className="font-semibold text-primary hover:underline">
             {t('signUpLink')}
          </Link>
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
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
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            {t('signInButton')}
          </Button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-muted-foreground/30"></div>
          <span className="mx-4 text-xs text-muted-foreground">{t('orSeparator')}</span>
          <div className="flex-grow border-t border-muted-foreground/30"></div>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={() => handleOAuthSignIn(googleProvider)} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('googleSignIn')}
          </Button>
        </div>

      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 pt-6">
         <p className="text-sm text-muted-foreground">
          {t('forgotPasswordPrompt')}{" "}
          <Link href="/auth/forgot-password" className="font-semibold text-primary hover:underline">{t('resetLink')}</Link>
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

export default function SignInPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <SignInPageContent />
        </Suspense>
    );
}
