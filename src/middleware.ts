import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['fr', 'en', 'tr'],
 
  // Used when no locale matches
  defaultLocale: 'fr'
});
 
export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next/static`, `/_next/image`, or `/__/auth`
  // - … the ones containing a dot (e.g. `favicon.ico`)
  matcher: ['/((?!api|_next/static|_next/image|__\\/auth|.*\\..*).*)']
};
