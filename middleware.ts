import createMiddleware from 'next-intl/middleware';
 
export default createMiddleware({
  // A list of all locales that are supported
  locales: ['fr', 'en', 'tr'],
 
  // Used when no locale matches
  defaultLocale: 'fr',
});
 
export const config = {
  // Match all request paths except for the ones starting with:
  // - api (API routes)
  // - _next/static (static files)
  // - _next/image (image optimization files)
  // - favicon.ico (favicon file)
  // - __/auth (Firebase Authentication)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|__/auth).*)']
};