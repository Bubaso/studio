
export function Footer() {
  return (
    <footer className="border-t">
      <div className="container py-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ReFind. Tous droits réservés.</p>
        <nav className="flex gap-4 mt-4 md:mt-0">
          <a href="#" className="hover:text-primary transition-colors">Politique de confidentialité</a>
          <a href="#" className="hover:text-primary transition-colors">Conditions d'utilisation</a>
        </nav>
      </div>
    </footer>
  );
}
