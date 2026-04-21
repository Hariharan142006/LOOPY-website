import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-key-change-this-in-production'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define protected routes and their required roles
  const protectedRoutes = [
    { path: '/admin', roles: ['ADMIN'] },
    { path: '/agent', roles: ['AGENT', 'ADMIN'] },
    { path: '/dashboard', roles: ['CUSTOMER', 'AGENT', 'ADMIN'] },
    { path: '/profile', roles: ['CUSTOMER', 'AGENT', 'ADMIN'] },
    { path: '/history', roles: ['CUSTOMER', 'AGENT', 'ADMIN'] },
  ];

  const currentProtected = protectedRoutes.find(route => pathname.startsWith(route.path));

  if (currentProtected) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }

    try {
      // Use jose for edge-compatible JWT verification in middleware
      const { payload } = await jwtVerify(token, SECRET_KEY);
      const userRole = (payload as any).role;

      if (!currentProtected.roles.includes(userRole)) {
        // Role mismatch, redirect to unauthorized or home
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (error) {
      // Invalid token
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/agent/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/history/:path*',
  ],
};
