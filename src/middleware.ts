import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // This middleware relies on a '__session' cookie for authenticated users.
  // Standard client-side Firebase Auth doesn't set this automatically.
  // This would typically be implemented via a custom backend endpoint that creates a session cookie.
  const sessionCookie = request.cookies.get('__session');
  const { pathname } = request.nextUrl;

  const protectedRoutes = [
    '/sell',
    '/profile', // This will match /profile and /profile/edit
    '/favorites',
    '/messages', // This will match /messages and /messages/[threadId]
  ];

  // Regex for dynamic routes like /items/an-id/edit
  const editItemPattern = /^\/items\/[^\/]+\/edit$/;

  const isProtectedRoute =
    protectedRoutes.some(route => pathname.startsWith(route)) ||
    editItemPattern.test(pathname);

  // If user tries to access a protected route without a session, redirect to sign-in page
  if (isProtectedRoute && !sessionCookie) {
    const loginUrl = new URL('/auth/signin', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// See "Matching Paths" in the Next.js docs for more info.
export const config = {
  matcher: [
    '/sell/:path*',
    '/profile/:path*',
    '/favorites/:path*',
    '/messages/:path*',
    '/items/:id/edit',
  ],
};
