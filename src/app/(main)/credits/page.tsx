
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Gem, LogIn } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

interface CreditPackage {
    id: string;
    credits: number;
    price: number; // in XOF
    name: string;
    description: string;
}

const creditPackages: CreditPackage[] = [
    { id: 'pack_1', credits: 10, price: 1000, name: "Paquet Débutant", description: "Pour commencer et lister quelques articles." },
    { id: 'pack_2', credits: 25, price: 2250, name: "Paquet Vendeur", description: "Le meilleur rapport qualité-prix pour les vendeurs réguliers." },
    { id: 'pack_3', credits: 50, price: 4000, name: "Paquet Pro", description: "Pour les professionnels et les boutiques." },
];

export default function CreditsPage() {
    const { firebaseUser, authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handlePurchase = async (pkg: CreditPackage) => {
        if (!firebaseUser) {
            toast({ variant: 'destructive', title: 'Connexion requise', description: 'Veuillez vous connecter pour acheter des crédits.' });
            router.push('/auth/signin?redirect=/credits');
            return;
        }

        setIsLoading(pkg.id);
        try {
            const idToken = await firebaseUser.getIdToken();
            const response = await fetch('/api/paytech/request-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    price: pkg.price,
                    creditAmount: pkg.credits,
                    packageName: pkg.name,
                }),
            });

            const data = await response.json();

            if (response.ok && data.redirect_url) {
                toast({ title: 'Redirection vers le paiement', description: 'Vous allez être redirigé vers la page de paiement sécurisée.' });
                window.location.href = data.redirect_url;
            } else {
                throw new Error(data.error || "Impossible d'initier le paiement.");
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Erreur', description: error.message });
            setIsLoading(null);
        }
    };
    
    if (authLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!firebaseUser) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
                <Alert className="max-w-md">
                    <LogIn className="h-4 w-4" />
                    <AlertTitle>Connexion requise</AlertTitle>
                    <AlertDescription>
                        Pour acheter des crédits, vous devez être connecté.
                    </AlertDescription>
                </Alert>
                <Link href="/auth/signin?redirect=/credits" className="mt-6">
                    <Button>
                        <LogIn className="mr-2 h-4 w-4" /> Se connecter
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <header className="text-center">
                <h1 className="text-3xl font-bold font-headline text-primary">Acheter des Crédits</h1>
                <p className="text-lg text-muted-foreground mt-2">
                    Rechargez votre compte pour continuer à poster des annonces.
                </p>
            </header>
            
            <div className="grid md:grid-cols-3 gap-8">
                {creditPackages.map((pkg) => (
                    <Card key={pkg.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl">{pkg.name}</CardTitle>
                            <CardDescription>{pkg.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <div className="text-4xl font-bold text-primary flex items-center">
                                {pkg.credits} <Gem className="ml-2 h-8 w-8" />
                            </div>
                            <div className="text-xl font-semibold mt-2">
                                {pkg.price.toLocaleString('fr-FR')} XOF
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                onClick={() => handlePurchase(pkg)}
                                disabled={!!isLoading}
                            >
                                {isLoading === pkg.id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    "Acheter ce paquet"
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
