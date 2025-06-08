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
import { ShoppingBag, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { mockSignIn } from "@/lib/mock-data"; // Mock auth

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Mock sign in: use email to determine user for demo. User 'user1@example.com' for Alice.
    let userIdToSignIn = 'user1'; // Default to Alice
    if (email.startsWith('user2')) userIdToSignIn = 'user2'; // Bob
    if (email.startsWith('user3')) userIdToSignIn = 'user3'; // Charlie

    const user = await mockSignIn(userIdToSignIn); // Using mock function
    
    if (user) {
      toast({ title: "Signed In", description: `Welcome back, ${user.name}!` });
      router.push("/"); // Redirect to home page after successful sign in
    } else {
      toast({ title: "Sign In Failed", description: "Invalid email or password.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <Link href="/" className="inline-block mx-auto mb-4">
          <ShoppingBag className="h-12 w-12 text-primary" />
        </Link>
        <CardTitle className="text-3xl font-headline">Welcome Back to ReFind</CardTitle>
        <CardDescription>Sign in to continue your journey of discovery and selling.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="you@example.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
            {isLoading ? <LogIn className="mr-2 h-4 w-4 animate-ping" /> : <LogIn className="mr-2 h-4 w-4" />}
            Sign In
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <Link href="#" className="text-sm text-primary hover:underline">
          Forgot your password?
        </Link>
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/auth/signup" className="font-semibold text-primary hover:underline">
             Sign Up <UserPlus className="inline ml-1 h-4 w-4" />
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
