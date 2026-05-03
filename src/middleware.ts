import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-key-change-this-in-production'
);

export async function middleware(request: NextRequest) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const response = await handleMiddleware(request);
    
    // Create a new response to ensure we can modify headers safely
    // or just add headers if it's a valid NextResponse
    const finalResponse = response || NextResponse.next();
    
    finalResponse.headers.set('Access-Control-Allow-Origin', '*');
    finalResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    finalResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return finalResponse;
  } catch (error) {
    console.error("Middleware Error:", error);
    return NextResponse.next();
  }
}

async function handleMiddleware(request: NextRequest) {
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
    '/api/:path*',
  ],
};
