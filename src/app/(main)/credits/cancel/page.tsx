
"use client";

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
    const searchParams = useSearchParams();
    const ref = searchParams.get('ref');

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
            <Card className="max-w-lg">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                       <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-headline">Paiement Annulé</CardTitle>
                    <CardDescription>
                       La transaction a été annulée. Aucun frais n'a été appliqué.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Si vous avez annulé par erreur, vous pouvez toujours retourner en arrière et réessayer.
                         {ref && ` (Référence: ${ref})`}
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2">
                     <Button asChild className="w-full sm:w-auto">
                        <Link href="/credits">Réessayer le paiement</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href="/browse">Retour à l'accueil</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
