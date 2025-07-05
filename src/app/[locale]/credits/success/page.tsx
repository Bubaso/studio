
"use client";

import { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTranslations } from 'next-intl';

function SuccessPageContent() {
    const t = useTranslations('SuccessCreditsPage');
    const searchParams = useSearchParams();
    const ref = searchParams.get('ref');
    const { toast } = useToast();
    const { firebaseUser } = useAuth();
    
    useEffect(() => {
        if (!ref || !firebaseUser) return;

        toast({
            title: t('toast.verifyingTitle'),
            description: t('toast.verifyingDesc'),
        });

        const paymentIntentRef = doc(db, "paymentIntents", ref);

        const unsubscribe = onSnapshot(paymentIntentRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status === 'success' && data.userId === firebaseUser.uid) {
                    toast({
                        variant: 'default',
                        title: t('toast.successTitle'),
                        description: t('toast.successDesc', { count: data.creditAmount }),
                        className: 'bg-green-100 border-green-300 text-green-800'
                    });
                    unsubscribe();
                } else if (data.status === 'failed') {
                     toast({
                        variant: 'destructive',
                        title: t('toast.failedTitle'),
                        description: t('toast.failedDesc', { error: data.error || '' }),
                    });
                    unsubscribe();
                }
            }
        }, (error) => {
            console.error("Error listening to payment intent:", error);
            toast({ variant: 'destructive', title: t('toast.verificationErrorTitle'), description: t('toast.verificationErrorDesc') });
            unsubscribe();
        });

        // Cleanup subscription on component unmount
        return () => unsubscribe();

    }, [ref, firebaseUser, toast, t]);
    

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
            <Card className="max-w-lg">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                       <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl font-headline">{t('title')}</CardTitle>
                    <CardDescription>
                        {t('description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <Alert>
                     <Loader2 className="h-4 w-4 animate-spin"/>
                     <AlertTitle>{t('verifyingAlertTitle')}</AlertTitle>
                     <AlertDescription>
                        {t('verifyingAlertDesc')}
                     </AlertDescription>
                   </Alert>
                    <p className="text-sm text-muted-foreground">
                        {t('referenceLabel')} <span className="font-mono bg-muted p-1 rounded-sm">{ref || 'N/A'}</span>
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2">
                    <Button asChild className="w-full sm:w-auto">
                        <Link href="/sell">{t('publishAd')}</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href="/browse">{t('continueBrowsing')}</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
}

export default function PaymentSuccessPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <SuccessPageContent />
        </Suspense>
    );
}
