
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
// import { auth } from "@/lib/firebase"; // Temporarily remove Firebase auth
// import { signInWithEmailAndPassword, onAuthStateChanged, User } from "firebase/auth"; // Temporarily remove Firebase auth

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // const [firebaseUser, setFirebaseUser] = useState<User | null>(null); // Temporarily remove Firebase auth state
  const [authLoading, setAuthLoading] = useState(false); // Default to false as we are not loading auth

  const redirectTo = searchParams.get('redirect') || '/';

  // useEffect(() => { // Temporarily remove auth listener
  //   console.log("SignInPage: Auth effect running (simplified - no auth)");
  //   // const unsubscribe = onAuthStateChanged(auth, (user) => {
  //   //   console.log("SignInPage: onAuthStateChanged callback, user:", user);
  //   //   setFirebaseUser(user);
  //   //   setAuthLoading(false);
  //   //   if (user) {
  //   //     console.log("SignInPage: User already signed in, redirecting to", redirectTo);
  //   //     router.push(redirectTo);
  //   //   } else {
  //   //     console.log("SignInPage: No user signed in.");
  //   //   }
  //   // });
  //   // return () => {
  //   //   console.log("SignInPage: Auth effect cleanup (simplified - no auth)");
  //   //   // unsubscribe();
  //   // };
  // }, [router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("SignInPage: handleSubmit called (simplified - no auth action)");
    setIsLoading(true);
    toast({ title: "Form Submitted (Simplified)", description: "Auth logic is temporarily disabled." });
    // Simulate a delay
    setTimeout(() => {
        setIsLoading(false);
        // router.push(redirectTo); // Don't redirect for now
    }, 1000);
    // try {
    //   // await signInWithEmailAndPassword(auth, email, password);
    //   // toast({ title: "Connexion réussie !", description: "Vous allez être redirigé." });
    //   // router.push(redirectTo);
    // } catch (error: any) {
    //   // let errorMessage = "Échec de la connexion. Vérifiez vos identifiants.";
    //   // if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
    //   //   errorMessage = "Adresse e-mail ou mot de passe incorrect.";
    //   // } else if (error.code === 'auth/invalid-email') {
    //   //   errorMessage = "Format d'email invalide.";
    //   // } else if (error.code === 'auth/too-many-requests') {
    //   //   errorMessage = "Trop de tentatives de connexion. Veuillez réessayer plus tard.";
    //   // }
    //   // toast({ title: "Erreur de connexion", description: errorMessage, variant: "destructive" });
    // } finally {
    //   // setIsLoading(false);
    // }
  };

  if (authLoading) { // This should ideally not be hit with current simplification
    console.log("Render: Auth is loading (simplified - should not happen often)...");
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ShoppingBag className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  // if (firebaseUser) { // Temporarily remove this block
  //    console.log("Render: User is already signed in. Redirecting (simplified)...");
  //    return (
  //     <div className="flex items-center justify-center min-h-screen">
  //       <p>Vous êtes déjà connecté. Redirection...</p>
  //     </div>
  //   );
  // }

  console.log("Render: Showing simplified sign-in form.");
  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <Link href="/" className="inline-block mx-auto mb-4">
          <ShoppingBag className="h-12 w-12 text-primary" />
        </Link>
        <CardTitle className="text-3xl font-headline">Connectez-vous à ReFind (Simplifié)</CardTitle>
        <CardDescription>Accédez à votre compte pour acheter et vendre.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            Se connecter (Simplifié)
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
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
