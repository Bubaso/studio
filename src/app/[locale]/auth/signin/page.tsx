
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
import { signInWithEmailAndPassword, onAuthStateChanged, type User as FirebaseUser, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { createUserDocument } from "@/services/userService";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from 'next/link';
import { useLocale, useTranslations } from "next-intl";

// Initialize OAuth providers
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);
  const isMobile = useIsMobile();

  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      // Only redirect if a login process is NOT active.
      // This prevents the race condition.
      if (user && !isLoading) {
        router.push(redirectTo);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [router, redirectTo, isLoading]);

  useEffect(() => {
    // This effect should run only once on mount to check for a redirect result.
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // User has successfully signed in via redirect.
          // Now create their user document in Firestore if it doesn't exist.
          const user = result.user;
          await createUserDocument(user, {
            name: user.displayName,
            avatarUrl: user.photoURL,
          }, locale);
          toast({
            title: t('toast.successTitle'),
            description: t('toast.welcome', { name: user.displayName || user.email }),
          });
          // The onAuthStateChanged listener will handle the final redirect.
        }
      })
      .catch((error) => {
        // Handle errors from the redirect result
        console.error("OAuth Redirect Error:", error);
        let errorMessage = t('toast.oauthErrorTitle');
        if (error.code === 'auth/account-exists-with-different-credential') {
          errorMessage = t('toast.oauthAccountExists');
        }
        toast({
          title: t('toast.errorTitle'),
          description: errorMessage,
          variant: "destructive",
        });
      })
      .finally(() => {
        // Whether there was a result or not, the check is complete.
        setIsProcessingRedirect(false);
      });
  }, [toast, router, redirectTo, t, locale]);

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: t('toast.successTitle'), description: t('toast.redirecting') });
      // The useEffect hook will handle the redirect
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: GoogleAuthProvider) => {
    setIsLoading(true);
    try {
      if (isMobile) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        await createUserDocument(user, {
          name: user.displayName,
          avatarUrl: user.photoURL,
        }, locale);

        toast({
          title: t('toast.successTitle'),
          description: t('toast.welcome', { name: user.displayName || user.email }),
        });
      }
    } catch (error: any) {
      // Gracefully handle the user closing the popup, which is not an application error.
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setIsLoading(false);
        return; // Exit without showing an error toast.
      }
      
      // For all other errors, log them and show a toast.
      console.error("OAuth Sign-in Error:", error);
      let errorMessage = t('toast.oauthErrorTitle');
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = t('toast.oauthAccountExists');
      } else if (error.code === 'auth/operation-not-allowed') {
          errorMessage = t('toast.providerNotEnabled');
      } else if (error.code === 'auth/network-request-failed') {
          errorMessage = t('toast.networkError');
      } else if (error.code === 'auth/unauthorized-domain') {
          errorMessage = t('toast.unauthorizedDomain');
      }
      toast({
        title: t('toast.oauthErrorTitle'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
    }
  };

  if (authLoading || isProcessingRedirect) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ShoppingBag className="h-12 w-12 text-primary animate-pulse" />
        <p className="ml-4">{t('verifyingSession')}</p>
      </div>
    );
  }

  if (firebaseUser && !authLoading) { 
     return (
      <div className="flex items-center justify-center min-h-screen">
        <p>{t('alreadyLoggedIn')}</p>
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

        <div className="my-6 flex items-center hidden">
          <div className="flex-grow border-t border-muted-foreground/30"></div>
          <span className="mx-4 text-xs text-muted-foreground">{t('orSeparator')}</span>
          <div className="flex-grow border-t border-muted-foreground/30"></div>
        </div>

        <div className="space-y-3 hidden">
          <Button variant="outline" className="w-full" onClick={() => handleOAuthSignIn(googleProvider)} disabled={isLoading}>
            {/* TODO: Add Google Icon */}
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
        <p className="text-sm text-muted-foreground">
          {t('noAccountPrompt')}{" "}
          <Link href={`/auth/signup?redirect=${encodeURIComponent(redirectTo)}`} className="font-semibold text-primary hover:underline">
             {t('signUpLink')}
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

export default function SignInPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <SignInPageContent />
        </Suspense>
    );
}
