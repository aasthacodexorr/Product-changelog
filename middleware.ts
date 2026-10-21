import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from './lib/auth/constants';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /panel routes (except /panel/login)
  if (pathname.startsWith('/panel') && pathname !== '/panel/login') {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
    if (!sessionCookie || !sessionCookie.value) {
      const loginUrl = new URL('/panel/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/panel/:path*'],
};
