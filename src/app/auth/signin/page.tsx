
"use client";

import Link from "next/link";
import { ShoppingBag, LogIn, Mail, Lock } from "lucide-react";
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
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase"; 
import { signInWithEmailAndPassword, onAuthStateChanged, type User as FirebaseUser, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, signInWithPopup } from "firebase/auth";
import { createUserDocument } from "@/services/userService";

// Initialize OAuth providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
// For Apple, you might need to add custom scopes if required:
// appleProvider.addScope('email');
// appleProvider.addScope('name');

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
      if (user) {
        router.push(redirectTo);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [router, redirectTo]);

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Connexion réussie !", description: "Vous allez être redirigé." });
      // The useEffect hook will handle the redirect
    } catch (error: any) {
      let errorMessage = "Échec de la connexion. Vérifiez vos identifiants.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Adresse e-mail ou mot de passe incorrect.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Format d'email invalide.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Trop de tentatives de connexion. Veuillez réessayer plus tard.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Erreur de réseau. Vérifiez votre connexion internet.";
      }
      toast({ title: "Erreur de connexion", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: GoogleAuthProvider | FacebookAuthProvider | OAuthProvider) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await createUserDocument(user, {
        name: user.displayName, 
        avatarUrl: user.photoURL,
      });

      toast({
        title: "Connexion réussie !",
        description: `Bienvenue, ${user.displayName || user.email}!`,
      });
      // Redirect is handled by the useEffect watching firebaseUser
    } catch (error: any) {
      console.error("OAuth Sign-in Error:", error);
      let errorMessage = "Une erreur s'est produite lors de la connexion avec le fournisseur OAuth.";
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = "Un compte existe déjà avec la même adresse e-mail mais des identifiants de connexion différents. Essayez de vous connecter avec le fournisseur utilisé à l'origine.";
      } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        errorMessage = "La fenêtre de connexion a été fermée avant la fin de l'opération.";
      } else if (error.code === 'auth/operation-not-allowed') {
          errorMessage = "La connexion avec ce fournisseur n'est pas activée. Veuillez vérifier la configuration Firebase.";
      } else if (error.code === 'auth/network-request-failed') {
          errorMessage = "Erreur de réseau. Vérifiez votre connexion internet et réessayez.";
      } else if (error.code === 'auth/unauthorized-domain') {
          errorMessage = "Ce domaine n'est pas autorisé pour les opérations OAuth. Vérifiez votre configuration Firebase.";
      }
      toast({
        title: "Erreur de connexion OAuth",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ShoppingBag className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  if (firebaseUser && !authLoading) { 
     return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Vous êtes déjà connecté. Redirection...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <Link href="/" className="inline-block mx-auto mb-4">
          <ShoppingBag className="h-12 w-12 text-primary" />
        </Link>
        <CardTitle className="text-3xl font-headline">Connectez-vous à JëndJaay</CardTitle>
        <CardDescription>Accédez à votre compte pour acheter et vendre.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="vous@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Votre mot de passe"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="pl-10"
              />
            </div>
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
            {isLoading ? <LogIn className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Se connecter
          </Button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-muted-foreground/30"></div>
          <span className="mx-4 text-xs text-muted-foreground">OU</span>
          <div className="flex-grow border-t border-muted-foreground/30"></div>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={() => handleOAuthSignIn(googleProvider)} disabled={isLoading}>
            {/* TODO: Add Google Icon */}
            {isLoading ? <LogIn className="mr-2 h-4 w-4 animate-spin" /> : null}
            Se connecter avec Google
          </Button>
          <Button variant="outline" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleOAuthSignIn(facebookProvider)} disabled={isLoading}>
            {/* TODO: Add Facebook Icon */}
            {isLoading ? <LogIn className="mr-2 h-4 w-4 animate-spin" /> : null}
            Se connecter avec Facebook
          </Button>
          <Button variant="outline" className="w-full bg-black hover:bg-gray-800 text-white" onClick={() => handleOAuthSignIn(appleProvider)} disabled={isLoading}>
            {/* TODO: Add Apple Icon */}
            {isLoading ? <LogIn className="mr-2 h-4 w-4 animate-spin" /> : null}
            Se connecter avec Apple
          </Button>
        </div>

      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2 pt-6">
         <p className="text-sm text-muted-foreground">
          Mot de passe oublié ? {/* <Link href="/auth/forgot-password" className="font-semibold text-primary hover:underline">Réinitialiser</Link> */}
        </p>
        <p className="text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href={`/auth/signup?redirect=${encodeURIComponent(redirectTo)}`} className="font-semibold text-primary hover:underline">
             S'inscrire
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
