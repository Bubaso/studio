
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Gem, LogIn, Info, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { getUserDocument } from '@/services/userService';
import type { UserProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';


interface CreditPackage {
    id: string;
    credits: number;
    price: number; // in XOF
    name: string;
    description: string;
    popular?: boolean;
    saving?: string;
}

const creditPackages: CreditPackage[] = [
    { id: 'pack_1', credits: 10, price: 1000, name: "Paquet Débutant", description: "Pour commencer et lister quelques articles." },
    { id: 'pack_2', credits: 25, price: 2250, name: "Paquet Vendeur", description: "Le meilleur rapport qualité-prix pour les vendeurs réguliers.", popular: true, saving: "ÉCONOMISEZ 10%" },
    { id: 'pack_3', credits: 50, price: 4000, name: "Paquet Pro", description: "Pour les professionnels et les boutiques.", saving: "ÉCONOMISEZ 20%" },
];
const BASE_PRICE_PER_AD = 100;

export default function CreditsPage() {
    const { firebaseUser, authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isPurchasing, setIsPurchasing] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (firebaseUser) {
            setIsLoadingProfile(true);
            getUserDocument(firebaseUser.uid)
                .then(profile => setUserProfile(profile))
                .finally(() => setIsLoadingProfile(false));
        } else {
            setIsLoadingProfile(false);
        }
    }, [firebaseUser, authLoading]);

    const handlePurchase = async (pkg: CreditPackage) => {
        if (!firebaseUser) {
            toast({ variant: 'destructive', title: 'Connexion requise', description: 'Veuillez vous connecter pour acheter des crédits.' });
            router.push('/auth/signin?redirect=/credits');
            return;
        }

        setIsPurchasing(pkg.id);
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
            setIsPurchasing(null);
        }
    };
    
    if (authLoading || isLoadingProfile) {
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
                <h1 className="text-3xl font-bold font-headline text-primary">Besoin de Crédits ?</h1>
                <p className="text-lg text-muted-foreground mt-2">
                    Rechargez votre compte pour mettre en avant et vendre plus d'articles.
                </p>
            </header>
            
            {userProfile && userProfile.freeListingsRemaining > 0 && (
                <Alert variant="default" className="bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
                    <CheckCircle className="h-4 w-4 !text-green-700 dark:!text-green-300" />
                    <AlertTitle>Bonne nouvelle !</AlertTitle>
                    <AlertDescription>
                        Il vous reste encore {userProfile.freeListingsRemaining} annonce(s) gratuite(s) à utiliser. Vous pouvez acheter des crédits maintenant pour plus tard, ou les utiliser d'abord.
                    </AlertDescription>
                </Alert>
            )}

            <Card className="bg-card/50">
                 <CardContent className="space-y-2 text-muted-foreground p-6">
                    <p className="flex items-center"><Gem className="mr-2 h-4 w-4 text-primary" />1 Crédit = 1 Annonce publiée.</p>
                    <p>
                        Vos <strong>5 premières annonces</strong> sont <strong>gratuites</strong> pour vous aider à démarrer !
                    </p>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-8">
                {creditPackages.map((pkg) => {
                    const pricePerAd = pkg.price / pkg.credits;
                    return (
                        <Card key={pkg.id} className={cn("flex flex-col relative", pkg.popular && "border-2 border-primary shadow-lg")}>
                             {pkg.popular && (
                                <Badge variant="default" className="absolute top-2 right-2">Le plus populaire</Badge>
                             )}
                            <CardHeader>
                                <CardTitle className="font-headline text-2xl">{pkg.name}</CardTitle>
                                <CardDescription>{pkg.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div className="text-4xl font-bold text-primary flex items-center">
                                    {pkg.credits} <Gem className="ml-2 h-8 w-8" />
                                </div>
                                
                                <div className="space-y-1">
                                    <p className="text-2xl font-bold">{pkg.price.toLocaleString('fr-FR')} XOF</p>
                                    <div className="text-sm text-muted-foreground h-5">
                                        {pricePerAd < BASE_PRICE_PER_AD ? (
                                            <span>
                                                soit <strong>{pricePerAd.toLocaleString('fr-FR')} XOF</strong> / annonce <span className="line-through ml-1">{BASE_PRICE_PER_AD.toLocaleString('fr-FR')} XOF</span>
                                            </span>
                                        ) : (
                                            <span>soit {pricePerAd.toLocaleString('fr-FR')} XOF / annonce</span>
                                        )}
                                    </div>
                                </div>

                                {pkg.saving && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">{pkg.saving}</Badge>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    onClick={() => handlePurchase(pkg)}
                                    disabled={!!isPurchasing}
                                >
                                    {isPurchasing === pkg.id ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        "Acheter ce paquet"
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>

            <p className="text-center text-sm text-muted-foreground">
                Tous les paiements sont traités de manière sécurisée par notre partenaire PayTech.
            </p>
        </div>
    );
}
