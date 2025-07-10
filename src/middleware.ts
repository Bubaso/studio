
import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['fr', 'en', 'tr'],
 
  // Used when no locale matches
  defaultLocale: 'fr'
});
 
export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  // - … the ones starting with `/__` (for Firebase auth)
  matcher: ['/((?!api|_next|_vercel|__.*|.*\\..*).*)']
};
