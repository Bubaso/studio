"use client";
import Link from 'next/link';
import { ShoppingBag, Search, PlusCircle, MessageSquare, User as UserIcon, LogIn, LogOut, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/types';
import { getMockCurrentUser, mockSignOut } from '@/lib/mock-data'; // Mock auth
import { useRouter } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    }
    getMockCurrentUser().then(setCurrentUser);
  }, []);

  const handleSignOut = async () => {
    await mockSignOut();
    setCurrentUser(null);
    router.push('/');
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/browse?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const navLinks = [
    { href: '/browse', label: 'Browse', icon: <Search className="h-4 w-4" /> },
    { href: '/sell', label: 'Sell', icon: <PlusCircle className="h-4 w-4" /> },
    { href: '/messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" /> },
  ];

  if (!mounted) {
    return ( // Skeleton or minimal header during SSR/hydration mismatch prevention
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline text-2xl text-primary">ReFind</span>
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <span className="font-bold font-headline text-2xl text-primary">ReFind</span>
        </Link>
        <nav className="flex items-center space-x-4 lg:space-x-6 mr-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === link.href ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="hidden md:inline">{link.label}</span>
              <span className="md:hidden">{link.icon}</span>
            </Link>
          ))}
        </nav>

        <form onSubmit={handleSearch} className="relative ml-auto mr-2 hidden sm:flex items-center">
           <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
           <Input
            type="search"
            placeholder="Search items..."
            className="pl-8 h-9 w-full sm:w-[200px] lg:w-[250px] rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          {currentUser ? (
            <>
              <Link href="/profile">
                <Button variant="ghost" size="icon" aria-label="Profile">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Sign Out</span>
              </Button>
            </>
          ) : (
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">
                <LogIn className="h-4 w-4 mr-1 md:mr-2" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
