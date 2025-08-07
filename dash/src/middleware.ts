import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-me-in-production'
);

const AUTH_COOKIE_NAME = 'catears-auth';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/api/upload-state',
];

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/verify',
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip auth check for public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    const token = request.cookies.get(AUTH_COOKIE_NAME);
    
    if (!token) {
      console.log(`[AUTH] Unauthorized access attempt to ${pathname} - no token`);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    try {
      const { payload } = await jwtVerify(token.value, JWT_SECRET);
      
      if (!payload.username || !payload.expiresAt) {
        throw new Error('Invalid token payload');
      }
      
      if (Date.now() > (payload.expiresAt as number)) {
        throw new Error('Token expired');
      }
      
      // Add username to request headers for logging
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-username', payload.username as string);
      
      console.log(`[AUTH] Authenticated request to ${pathname} by ${payload.username}`);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.log(`[AUTH] Invalid token for ${pathname}: ${error}`);
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};