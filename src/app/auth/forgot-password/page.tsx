
"use client";

import { ShoppingBag, Mail, Send } from "lucide-react";
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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import Link from 'next/link';
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations('ForgotPasswordPage');
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      auth.languageCode = 'fr'; // Set email language to French
      await sendPasswordResetEmail(auth, email);
      toast({
        title: t('toast.emailSentTitle'),
        description: t('toast.emailSentDesc', { email }),
      });
      setIsEmailSent(true);
    } catch (error: any) {
      let errorMessage = t('toast.genericError');
      if (error.code === 'auth/invalid-email') {
        errorMessage = t('toast.invalidEmail');
      } else if (error.code === 'auth/user-not-found') {
        setIsEmailSent(true);
        console.log("User not found for password reset, but showing generic success message.");
      } else {
        toast({
            title: t('toast.errorTitle'),
            description: errorMessage,
            variant: "destructive",
        });
      }
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
        <CardTitle className="text-3xl font-headline">{t('title')}</CardTitle>
        <CardDescription>
          {isEmailSent
            ? t('checkInbox')
            : t('enterEmail')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isEmailSent ? (
          <div className="text-center p-4 bg-green-100/50 rounded-md">
            <p className="text-green-800">{t('emailSentConfirmation', { email })}</p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('emailLabel')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="pl-10"
                />
              </div>
            </div>
            <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
              {isLoading ? <Send className="mr-2 h-4 w-4 animate-ping" /> : <Send className="mr-2 h-4 w-4" />}
              {t('sendLinkButton')}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-center pt-6">
        <Button variant="link" asChild>
          <Link href="/auth/signin">{t('backToLogin')}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
