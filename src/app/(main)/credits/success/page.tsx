
"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function PaymentSuccessPage() {
    const searchParams = useSearchParams();
    const ref = searchParams.get('ref');
    const { toast } = useToast();
    const { firebaseUser } = useAuth();
    
    useEffect(() => {
        if (!ref || !firebaseUser) return;

        toast({
            title: 'Vérification du paiement...',
            description: 'Veuillez patienter pendant que nous confirmons votre transaction.',
        });

        const paymentIntentRef = doc(db, "paymentIntents", ref);

        const unsubscribe = onSnapshot(paymentIntentRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'success' && data.userId === firebaseUser.uid) {
                    toast({
                        variant: 'default',
                        title: 'Paiement réussi !',
                        description: `Vos ${data.creditAmount} crédits ont été ajoutés à votre compte.`,
                        className: 'bg-green-100 border-green-300 text-green-800'
                    });
                    unsubscribe();
                } else if (data.status === 'failed') {
                     toast({
                        variant: 'destructive',
                        title: 'Paiement échoué',
                        description: `La transaction a échoué. ${data.error || ''}`,
                    });
                    unsubscribe();
                }
            }
        }, (error) => {
            console.error("Error listening to payment intent:", error);
            toast({ variant: 'destructive', title: 'Erreur de vérification', description: 'Impossible de vérifier le statut de votre paiement en temps réel.' });
            unsubscribe();
        });

        // Cleanup subscription on component unmount
        return () => unsubscribe();

    }, [ref, firebaseUser, toast]);
    

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
            <Card className="max-w-lg">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                       <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl font-headline">Paiement Réussi</CardTitle>
                    <CardDescription>
                        Merci pour votre achat ! Votre paiement a été traité avec succès.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <Alert>
                     <Loader2 className="h-4 w-4 animate-spin"/>
                     <AlertTitle>Vérification en cours...</AlertTitle>
                     <AlertDescription>
                        Nous attendons la confirmation finale de la part du service de paiement. Vos crédits seront ajoutés à votre compte dans quelques instants. Vous pouvez fermer cette page.
                     </AlertDescription>
                   </Alert>
                    <p className="text-sm text-muted-foreground">
                        Numéro de référence de la transaction : <span className="font-mono bg-muted p-1 rounded-sm">{ref || 'N/A'}</span>
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2">
                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/sell">Publier une annonce</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href="/browse">Continuer à naviguer</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

// Dummy Alert component for structure, will use the real one from ui
const Alert = ({children}:{children:React.ReactNode}) => <div className="border rounded-md p-4 text-left flex">{children}</div>;
const AlertTitle = ({children}:{children:React.ReactNode}) => <h5 className="font-medium ml-2">{children}</h5>
const AlertDescription = ({children}:{children:React.ReactNode}) => <div className="text-sm ml-2">{children}</div>
