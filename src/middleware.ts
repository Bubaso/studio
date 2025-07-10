
import createMiddleware from 'next-intl/middleware';
import {NextRequest} from 'next/server';
 
export default async function middleware(request: NextRequest) {
  // This is the default middleware configured for `next-intl`
  const handleI18nRouting = createMiddleware({
    locales: ['fr', 'en', 'tr'],
    defaultLocale: 'fr'
  });
  const response = handleI18nRouting(request);
  return response;
}
 
export const config = {
  // Skip all paths that should not be internationalized. This includes
  // a positive lookahead to exclude API routes, Next.js system files,
  // and paths with file extensions.
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
