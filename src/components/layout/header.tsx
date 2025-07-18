
"use client";
import {Link, usePathname, useRouter} from '@/navigation';
import { ShoppingBag, Search, PlusCircle, MessageSquare, User as UserIcon, LogIn, LogOut, Heart, Circle, Gem } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEffect, useState, useRef } from 'react';
import { auth, db } from '@/lib/firebase'; 
import { signOut } from 'firebase/auth'; 
import { collection, query, where, onSnapshot, Unsubscribe, doc } from 'firebase/firestore';
import type { MessageThread, UserProfile } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '../NotificationCenter';
import { useLocale, useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';

interface NavLink {
  href: string;
  label: string;
  icon: JSX.Element;
  id?: string;
}

const NOTIFICATION_KEY = 'foundingMemberNotified';

export function Header() {
  const t = useTranslations('Header');
  const tNotifier = useTranslations('FoundingMemberNotifier');
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { firebaseUser: currentUser, authLoading: isLoadingAuth } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const [hasNewMessageActivity, setHasNewMessageActivity] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();
  const notifierFiredRef = useRef(false);

  const mainLinks: NavLink[] = [
    { href: '/browse', label: t('nav.browse'), icon: <Search className="h-4 w-4" /> },
    { href: '/sell', label: t('nav.sell'), icon: <PlusCircle className="h-4 w-4" /> },
  ];

  const userLinks: NavLink[] = [
    { href: '/messages', label: t('nav.messages'), icon: <MessageSquare className="h-4 w-4" />, id: 'messages' },
    { href: '/favorites', label: t('nav.favorites'), icon: <Heart className="h-4 w-4" /> },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let unsubscribeThreads: Unsubscribe = () => {};
    let unsubscribeProfile: Unsubscribe = () => {};

    if (currentUser) {
      // Listen for message activity
      const threadsQuery = query(
        collection(db, 'messageThreads'),
        where('participantIds', 'array-contains', currentUser.uid)
      );
      unsubscribeThreads = onSnapshot(threadsQuery, (querySnapshot) => {
        const newActivity = querySnapshot.docs.some(doc => {
          const threadData = doc.data() as MessageThread;
          return threadData.lastMessageSenderId && 
                 threadData.lastMessageSenderId !== currentUser.uid &&
                 (!threadData.participantsWhoHaveSeenLatest || !threadData.participantsWhoHaveSeenLatest.includes(currentUser.uid));
        });
        setHasNewMessageActivity(newActivity && !pathname.startsWith('/messages'));
      }, (error) => {
        console.error("Error fetching message threads for notification: ", error);
        setHasNewMessageActivity(false);
      });

      // Listen for user profile changes (credits, etc.)
      const userDocRef = doc(db, 'users', currentUser.uid);
      unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
              const profile = docSnap.data() as UserProfile;
              setUserProfile(profile);

              // Check for founding member status here
              if (profile.isFoundingMember && !notifierFiredRef.current) {
                  const hasBeenNotified = sessionStorage.getItem(NOTIFICATION_KEY);
                  if (!hasBeenNotified) {
                    toast({
                      title: (
                        <div className="flex items-center gap-2">
                          <Gem className="h-5 w-5 text-primary" />
                          {tNotifier('title')}
                        </div>
                      ),
                      description: tNotifier('description'),
                      className: 'text-base',
                      duration: 20000,
                    });
                    sessionStorage.setItem(NOTIFICATION_KEY, 'true');
                  }
                  notifierFiredRef.current = true;
              }
          } else {
              setUserProfile(null);
          }
      });

    } else {
      setHasNewMessageActivity(false);
      setUserProfile(null);
      notifierFiredRef.current = false;
    }

    return () => {
        unsubscribeThreads();
        unsubscribeProfile();
    };
  }, [currentUser, pathname, tNotifier, toast]);


  const handleSignOut = async () => {
    try {
      await signOut(auth);
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

  if (!mounted || isLoadingAuth) {
    return ( 
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline text-2xl text-primary">JëndJaay</span>
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
          <span className="font-bold font-headline text-2xl text-primary">JëndJaay</span>
        </Link>
        <nav className="flex items-center space-x-4 lg:space-x-6 mr-auto">
          {mainLinks.map((link) => (
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
          {currentUser && userLinks.map((link) => (
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
            placeholder={t('searchPlaceholder')}
            className="pl-8 h-9 w-full sm:w-[200px] lg:w-[250px] rounded-md"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        <div className="flex items-center space-x-1 md:space-x-2">
          {currentUser ? (
            <>
              <NotificationCenter />
              {userProfile && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href="/credits">
                         <Button
                          variant="ghost"
                          className={cn(
                            "relative h-10 w-10 p-0 rounded-md md:w-auto md:h-9 md:px-3"
                          )}
                        >
                          <Gem className="h-5 w-5 text-primary md:mr-2 md:h-4 md:w-4" />
                          <span className="hidden md:inline">{userProfile.credits}</span>
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('userMenu.creditsTooltip', { credits: userProfile.credits })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Link href="/profile">
                <Button variant="ghost" size="icon" aria-label={t('userMenu.profileTooltip')}>
                  <UserIcon className="h-5 w-5" />
                </Button>
              </Link>
              <Button variant="ghost" className="h-10 w-10 p-0 md:h-9 md:w-auto md:px-3" onClick={handleSignOut}>
                <LogOut className="h-5 w-5 md:h-4 md:w-4 md:mr-2" />
                <span className="hidden md:inline">{t('userMenu.signOut')}</span>
              </Button>
            </>
          ) : (
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm">
                <LogIn className="h-4 w-4 mr-1 md:mr-2" />
                {t('userMenu.signIn')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
