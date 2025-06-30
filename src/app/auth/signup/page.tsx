
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingBag, UserPlus, LogIn } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase"; 
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, type User as FirebaseUser, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { createUserDocument } from "@/services/userService"; 
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslations } from "next-intl";
import {Link as IntlLink} from '@/navigation';


// Initialize OAuth providers
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
const facebookProvider = new FacebookAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
// For Apple, you might need to add custom scopes if required:
// appleProvider.addScope('email');
// appleProvider.addScope('name');


export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('Auth');
  const { toast } = useToast();
  const [name, setName] = useState('');
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
      if (user) {
        // If user is already logged in (e.g. signed up via OAuth or had a session), redirect
        router.push(redirectTo);
      }
    });
    return () => unsubscribe();
  }, [router, redirectTo]);

  useEffect(() => {
    // This effect should run only once on mount to check for a redirect result.
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // User has successfully signed in via redirect.
          // Now create their user document in Firestore.
          const user = result.user;
          await createUserDocument(user, {
            name: user.displayName,
            avatarUrl: user.photoURL,
          });
          toast({
            title: t('signupSuccessTitle'),
            description: t('welcomeUser', { name: user.displayName || user.email }),
          });
          // The onAuthStateChanged listener will handle the final redirect.
        }
      })
      .catch((error) => {
        // Handle errors from the redirect result
        console.error("OAuth Redirect Error:", error);
        let errorMessage = t('oauthError');
        if (error.code === 'auth/account-exists-with-different-credential') {
          errorMessage = t('oauthAccountExistsError');
        }
        toast({
          title: t('loginErrorTitle'),
          description: errorMessage,
          variant: "destructive",
        });
      })
      .finally(() => {
        // Whether there was a result or not, the check is complete.
        setIsProcessingRedirect(false);
      });
  }, [t, redirectTo, router]);

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      auth.languageCode = 'fr';
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      await updateProfile(fbUser, { displayName: name });
      await createUserDocument(fbUser, { name }); 
      
      toast({ 
        title: t('signupSuccessTitle'), 
        description: t('welcomeAndAccountActive')
      });
      router.push(redirectTo); 
    } catch (error: any) {
      console.error("Error signing up with email/password:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        toast({
          title: t('emailInUseTitle'),
          description: t('emailInUseDescription'),
          variant: "destructive",
          action: (
            <Button asChild variant="secondary" size="sm">
              <IntlLink href={`/auth/signin?redirect=${encodeURIComponent(redirectTo)}`}>
                {t('loginAction')}
              </IntlLink>
            </Button>
          ),
        });
      } else {
        let errorMessage = t('signupError');
        if (error.code === 'auth/weak-password') {
          errorMessage = t('weakPasswordError');
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = t('invalidEmailError');
        } else if (error.code === 'auth/operation-not-allowed' || (error.message && error.message.includes("CREDENTIAL_TOO_OLD_LOGIN_AGAIN")) || error.code === 'auth/configuration-not-found' || (error.name === 'FirebaseError' && error.message.includes('HTTP Rsp Error: 400'))) {
          errorMessage = t('configError');
        }
        toast({ title: t('signupErrorTitle'), description: errorMessage, variant: "destructive" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignUp = async (provider: GoogleAuthProvider | FacebookAuthProvider | OAuthProvider) => {
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
        });

        toast({
          title: t('signupSuccessTitle'),
          description: t('welcomeUser', { name: user.displayName || user.email }),
        });
      }
    } catch (error: any) {
      console.error("OAuth Sign-up Error:", error);
      let errorMessage = t('oauthError');
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = t('oauthAccountExistsErrorLong');
      } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        errorMessage = t('popupClosedError');
      } else if (error.code === 'auth/operation-not-allowed') {
          errorMessage = t('oauthNotEnabledError');
      } else if (error.code === 'auth/network-request-failed') {
          errorMessage = t('networkError');
      } else if (error.code === 'auth/unauthorized-domain') {
          errorMessage = t('unauthorizedDomainError');
      }
      toast({
        title: t('oauthErrorTitle'),
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
        <IntlLink href="/" className="inline-block mx-auto mb-4">
          <ShoppingBag className="h-12 w-12 text-primary" />
        </IntlLink>
        <CardTitle className="text-3xl font-headline">{t('signupTitle')}</CardTitle>
        <CardDescription>{t('signupDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('fullNameLabel')}</Label>
            <Input 
              id="name" 
              type="text" 
              placeholder={t('fullNamePlaceholder')} 
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('emailLabel')}</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder={t('emailPlaceholder')} 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('passwordLabel')}</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder={t('passwordPlaceholderStrong')} 
              required 
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
            {isLoading ? <UserPlus className="mr-2 h-4 w-4 animate-ping" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {t('createAccountAction')}
          </Button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-muted-foreground/30"></div>
          <span className="mx-4 text-xs text-muted-foreground">{t('or')}</span>
          <div className="flex-grow border-t border-muted-foreground/30"></div>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={() => handleOAuthSignUp(googleProvider)} disabled={isLoading}>
            {/* TODO: Add Google Icon */}
            {isLoading ? <LogIn className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('signupWithGoogle')}
          </Button>
          <Button variant="outline" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleOAuthSignUp(facebookProvider)} disabled={isLoading}>
            {/* TODO: Add Facebook Icon */}
            {isLoading ? <LogIn className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('signupWithFacebook')}
          </Button>
          <Button variant="outline" className="w-full bg-black hover:bg-gray-800 text-white" onClick={() => handleOAuthSignUp(appleProvider)} disabled={isLoading}>
            {/* TODO: Add Apple Icon */}
            {isLoading ? <LogIn className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('signupWithApple')}
          </Button>
        </div>

      </CardContent>
      <CardFooter className="flex flex-col items-center pt-6">
        <p className="text-sm text-muted-foreground">
          {t('alreadyHaveAccount')}{" "}
          <IntlLink href={`/auth/signin?redirect=${encodeURIComponent(redirectTo)}`} className="font-semibold text-primary hover:underline">
             {t('loginAction')} <LogIn className="inline ml-1 h-4 w-4" />
          </IntlLink>
        </p>
      </CardFooter>
    </Card>
  );
}

    