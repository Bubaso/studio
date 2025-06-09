
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
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase"; // Import Firebase auth
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { createUserDocument } from "@/services/userService"; // Import service to create user doc

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // This log will show the config the 'auth' object is using on the client-side
    // console.log("Client-side Firebase config being used by auth object:", auth.app.options);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile with the name
      await updateProfile(firebaseUser, { displayName: name });

      // Create a user document in Firestore
      await createUserDocument(firebaseUser, { name }); // Pass name from form to ensure it's set
      
      toast({ title: "Compte créé !", description: `Bienvenue sur ReFind, ${name} !` });
      router.push("/"); // Redirect to homepage or profile after signup
    } catch (error: any) {
      console.error("Error signing up:", error);
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

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <Link href="/" className="inline-block mx-auto mb-4">
          <ShoppingBag className="h-12 w-12 text-primary" />
        </Link>
        <CardTitle className="text-3xl font-headline">Rejoignez ReFind Aujourd'hui</CardTitle>
        <CardDescription>Créez votre compte pour commencer à acheter et vendre des articles uniques.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
      </CardContent>
      <CardFooter className="flex flex-col items-center">
        <p className="text-sm text-muted-foreground">
          Vous avez déjà un compte ?{" "}
          <Link href="/auth/signin" className="font-semibold text-primary hover:underline">
             Se connecter <LogIn className="inline ml-1 h-4 w-4" />
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
