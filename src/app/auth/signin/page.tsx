
"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <Link href="/" className="inline-block mx-auto mb-4">
          <ShoppingBag className="h-12 w-12 text-primary" />
        </Link>
        <CardTitle className="text-3xl font-headline">Se Connecter (Simplifié)</CardTitle>
        <CardDescription>Ceci est une version simplifiée de la page de connexion pour le débogage.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-center text-muted-foreground">
          Si vous voyez ceci, le rendu de base de la page fonctionne.
        </p>
        <div className="mt-6 text-center">
          <Button onClick={() => alert('Test button clicked!')}>Bouton de Test</Button>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-center">
        <p className="text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/auth/signup" className="font-semibold text-primary hover:underline">
             S'inscrire
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
