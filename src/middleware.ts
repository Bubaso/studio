
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
  // This matcher is intentionally broad to catch all requests,
  // so the bypass logic inside the middleware function can work effectively.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
