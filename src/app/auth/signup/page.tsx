
"use client";

import Link from "next/link";
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
import { createUserWithEmailAndPassword, updateProfile, onAuthStateChanged, type User as FirebaseUser, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider, signInWithPopup } from "firebase/auth";
import { createUserDocument } from "@/services/userService"; 

// Initialize OAuth providers
const googleProvider = new GoogleAuthProvider();
const facebookProvider = new FacebookAuthProvider();
const appleProvider = new OAuthProvider('apple.com');
// For Apple, you might need to add custom scopes if required:
// appleProvider.addScope('email');
// appleProvider.addScope('name');


export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [name, setName] = useState('');
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
        // If user is already logged in (e.g. signed up via OAuth or had a session), redirect
        router.push(redirectTo);
      }
    });
    return () => unsubscribe();
  }, [router, redirectTo]);

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      await updateProfile(fbUser, { displayName: name });
      await createUserDocument(fbUser, { name }); 
      
      toast({ title: "Compte créé !", description: `Bienvenue sur JëndJaay, ${name} !` });
      router.push(redirectTo); 
    } catch (error: any) {
      console.error("Error signing up with email/password:", error);
      let errorMessage = "Échec de la création du compte. Veuillez réessayer.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Cette adresse e-mail est déjà utilisée.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Le mot de passe doit comporter au moins 6 caractères.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Format d'email invalide.";
      } else if (error.code === 'auth/operation-not-allowed' || (error.message && error.message.includes("CREDENTIAL_TOO_OLD_LOGIN_AGAIN")) || error.code === 'auth/configuration-not-found' || (error.name === 'FirebaseError' && error.message.includes('HTTP Rsp Error: 400'))) {
         errorMessage = "Erreur de configuration ou requête invalide. Veuillez vérifier que la méthode d'authentification par e-mail/mot de passe est activée dans les paramètres de votre projet Firebase et que votre configuration API est correcte.";
      }
      toast({ title: "Erreur d'inscription", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignUp = async (provider: GoogleAuthProvider | FacebookAuthProvider | OAuthProvider) => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Ensure user document exists in Firestore.
      // For OAuth, displayName and photoURL from user object are good defaults.
      // Name from form is not used here as OAuth provides it.
      await createUserDocument(user, {
        name: user.displayName, 
        avatarUrl: user.photoURL,
      });

      toast({
        title: "Inscription réussie !",
        description: `Bienvenue, ${user.displayName || user.email}!`,
      });
      // Redirect is handled by the useEffect watching firebaseUser
    } catch (error: any) {
      console.error("OAuth Sign-up Error:", error);
      let errorMessage = "Une erreur s'est produite lors de l'inscription avec le fournisseur OAuth.";
      if (error.code === 'auth/account-exists-with-different-credential') {
        errorMessage = "Un compte existe déjà avec la même adresse e-mail mais des identifiants de connexion différents. Essayez de vous connecter avec le fournisseur utilisé à l'origine.";
      } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        errorMessage = "La fenêtre d'inscription a été fermée avant la fin de l'opération.";
      } else if (error.code === 'auth/operation-not-allowed') {
          errorMessage = "L'inscription avec ce fournisseur n'est pas activée. Veuillez vérifier la configuration Firebase.";
      } else if (error.code === 'auth/network-request-failed') {
          errorMessage = "Erreur de réseau. Vérifiez votre connexion internet et réessayez.";
      } else if (error.code === 'auth/unauthorized-domain') {
          errorMessage = "Ce domaine n'est pas autorisé pour les opérations OAuth. Vérifiez votre configuration Firebase.";
      }
      toast({
        title: "Erreur d'inscription OAuth",
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
        <CardTitle className="text-3xl font-headline">Rejoignez JëndJaay Aujourd'hui</CardTitle>
        <CardDescription>Créez votre compte pour commencer à acheter et vendre des articles uniques.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom complet</Label>
            <Input 
              id="name" 
              type="text" 
              placeholder="Votre Nom" 
              required 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="vous@example.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="Créez un mot de passe fort" 
              required 
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
            {isLoading ? <UserPlus className="mr-2 h-4 w-4 animate-ping" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Créer un compte
          </Button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-muted-foreground/30"></div>
          <span className="mx-4 text-xs text-muted-foreground">OU</span>
          <div className="flex-grow border-t border-muted-foreground/30"></div>
        </div>

        <div className="space-y-3">
          <Button variant="outline" className="w-full" onClick={() => handleOAuthSignUp(googleProvider)} disabled={isLoading}>
            {/* TODO: Add Google Icon */}
            {isLoading ? <LogIn className="mr-2 h-4 w-4 animate-spin" /> : null}
            S'inscrire avec Google
          </Button>
          <Button variant="outline" className="w-full bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleOAuthSignUp(facebookProvider)} disabled={isLoading}>
            {/* TODO: Add Facebook Icon */}
            {isLoading ? <LogIn className="mr-2 h-4 w-4 animate-spin" /> : null}
            S'inscrire avec Facebook
          </Button>
          <Button variant="outline" className="w-full bg-black hover:bg-gray-800 text-white" onClick={() => handleOAuthSignUp(appleProvider)} disabled={isLoading}>
            {/* TODO: Add Apple Icon */}
            {isLoading ? <LogIn className="mr-2 h-4 w-4 animate-spin" /> : null}
            S'inscrire avec Apple
          </Button>
        </div>

      </CardContent>
      <CardFooter className="flex flex-col items-center pt-6">
        <p className="text-sm text-muted-foreground">
          Vous avez déjà un compte ?{" "}
          <Link href={`/auth/signin?redirect=${encodeURIComponent(redirectTo)}`} className="font-semibold text-primary hover:underline">
             Se connecter <LogIn className="inline ml-1 h-4 w-4" />
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
