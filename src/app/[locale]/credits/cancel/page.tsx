
"use client";

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { XCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

function CancelPageContent() {
    const t = useTranslations('CancelCreditsPage');
    const searchParams = useSearchParams();
    const ref = searchParams.get('ref');

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center p-4">
            <Card className="max-w-lg">
                <CardHeader>
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
                       <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl font-headline">{t('title')}</CardTitle>
                    <CardDescription>
                       {t('description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        {t('info')}
                         {ref && ` (${t('reference', {ref})})`}
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-2">
                     <Button asChild className="w-full sm:w-auto">
                        <Link href="/credits">{t('retryPayment')}</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href="/browse">{t('backToHome')}</Link>
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

export default function PaymentCancelPage() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <CancelPageContent />
        </Suspense>
    );
}
