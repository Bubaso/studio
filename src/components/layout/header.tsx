
"use client";
import Link from 'next/link';
import { ShoppingBag, Search, PlusCircle, MessageSquare, User as UserIcon, LogIn, LogOut, Moon, Sun, Heart, Circle } from 'lucide-react'; // Added Circle
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase'; 
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth'; 
import { collection, query, where, onSnapshot, Unsubscribe } from 'firebase/firestore';
import type { MessageThread } from '@/lib/types';

interface NavLink {
  href: string;
  label: string;
  icon: JSX.Element;
  id?: string; // Optional id for specific links like 'messages'
}

const initialMainLinks: NavLink[] = [
  { href: '/browse', label: 'Parcourir', icon: <Search className="h-4 w-4" /> },
  { href: '/sell', label: 'Vendre', icon: <PlusCircle className="h-4 w-4" /> },
];

const initialUserLinks: NavLink[] = [
  { href: '/messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" />, id: 'messages' },
  { href: '/favorites', label: 'Favoris', icon: <Heart className="h-4 w-4" /> },
];


export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [hasNewMessageActivity, setHasNewMessageActivity] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsLoadingAuth(false);
    });

    return () => unsubscribeAuth(); 
  }, []);

  useEffect(() => {
    let unsubscribeThreads: Unsubscribe = () => {};

    if (currentUser) {
      const threadsQuery = query(
        collection(db, 'messageThreads'),
        where('participantIds', 'array-contains', currentUser.uid)
      );
      unsubscribeThreads = onSnapshot(threadsQuery, (querySnapshot) => {
        const newActivity = querySnapshot.docs.some(doc => {
          const threadData = doc.data() as MessageThread;
          return threadData.lastMessageSenderId && threadData.lastMessageSenderId !== currentUser.uid;
          // More sophisticated: check against a lastReadTimestamp for this thread
        });
        setHasNewMessageActivity(newActivity);
      }, (error) => {
        console.error("Error fetching message threads for notification: ", error);
        setHasNewMessageActivity(false);
      });
    } else {
      setHasNewMessageActivity(false); // Clear if user logs out
    }
    return () => unsubscribeThreads();
  }, [currentUser]);


  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      router.push('/');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
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

  if (!mounted || isLoadingAuth) {
    return ( 
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
          {initialMainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${
                pathname === link.href ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="hidden md:inline">{link.label}</span>
              <span className="md:hidden" title={link.label}>{link.icon}</span>
            </Link>
          ))}
          {currentUser && initialUserLinks.map((link) => (
             <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary relative ${
                pathname === link.href ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <span className="hidden md:inline-flex items-center">
                {link.icon}
                <span className="ml-1">{link.label}</span>
                 {link.id === 'messages' && hasNewMessageActivity && (
                  <Circle className="ml-1.5 h-2 w-2 fill-red-500 text-red-500" />
                )}
              </span>
              <span className="md:hidden relative" title={link.label}>
                {link.icon}
                {link.id === 'messages' && hasNewMessageActivity && (
                  <Circle className="absolute -top-0.5 -right-0.5 h-2 w-2 fill-red-500 text-red-500 ring-1 ring-background" />
                )}
              </span>
            </Link>
          ))}
        </nav>

        <form onSubmit={handleSearch} className="relative ml-auto mr-2 hidden sm:flex items-center">
           <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
           <Input
            type="search"
            placeholder="Rechercher des articles..."
            className="pl-8 h-9 w-full sm:w-[200px] lg:w-[250px] rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Changer de thème">
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          {currentUser ? (
            <>
              <Link href="/profile">
                <Button variant="ghost" size="icon" aria-label="Profil">
                  <UserIcon className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden md:inline">Déconnexion</span>
              </Button>
            </>
          ) : (
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">
                <LogIn className="h-4 w-4 mr-1 md:mr-2" />
                Connexion
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

