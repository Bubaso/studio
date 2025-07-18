
import {Link} from '@/navigation';
import { useLocale } from 'next-intl';

export function Footer() {
  const locale = useLocale();
  return (
    <footer className="border-t">
      <div className="container py-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} JëndJaay. Tous droits réservés.</p>
        <nav className="flex gap-4 mt-4 md:mt-0">
          <Link href="/privacy-policy" className="hover:text-primary transition-colors">Politique de confidentialité</Link>
          <Link href="/terms-of-use" className="hover:text-primary transition-colors">Conditions d'utilisation</Link>
        </nav>
      </div>
    </footer>
  );
}
