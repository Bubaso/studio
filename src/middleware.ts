
import createMiddleware from 'next-intl/middleware';
import {NextRequest} from 'next/server';
 
export default async function middleware(request: NextRequest) {
  // Check if the path is for Firebase Authentication.
  // If it is, bypass the i18n routing.
  if (request.nextUrl.pathname.startsWith('/__/auth/')) {
    return;
  }
 
  // This is the default middleware configured for `next-intl`
  const handleI18nRouting = createMiddleware({
    locales: ['fr', 'en', 'tr'],
    defaultLocale: 'fr'
  });
  const response = handleI18nRouting(request);
  return response;
}
 
export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!api|_next|_vercel|.*\\..*).*)',
    // Match all pathnames within `/` (e.g. `/(tr)/`, `/(en)/`)
    '/(tr|en)/:path*'
  ]
};
