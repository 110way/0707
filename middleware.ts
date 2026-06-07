import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Identify path classifications
  const isLoginPage = pathname === '/login';
  
  // Public APIs
  const isPublicApi = 
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/api/auth/register') ||
    (pathname.startsWith('/api/concerns') && request.method === 'POST') ||
    /^\/api\/concerns\/[^/]+\/status$/.test(pathname);

  const isApiRoute = pathname.startsWith('/api/');

  // 2. Read cookie wb_token
  const token = request.cookies.get('wb_token')?.value;

  // 3. Verify token
  const user = token ? await verifyJwt(token) : null;

  // 4. Handle API protection rules
  if (isApiRoute) {
    if (isPublicApi) {
      return NextResponse.next();
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role-based protection for /api/admin paths (Admin only)
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/dashboard')) {
      if (user.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Pass decoded user in headers to downstream api handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', user.id);
    requestHeaders.set('x-user-role', user.role);
    requestHeaders.set('x-user-dept', user.department);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 5. Handle Page protection rules
  if (!user) {
    // Redirect unauthenticated user to login (unless they're already on it)
    if (!isLoginPage) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // User is authenticated
  if (isLoginPage) {
    // Redirect authenticated user away from login
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Protect Dashboard page from regular employees (Admin only)
  if (pathname.startsWith('/dashboard')) {
    if (user.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public folder files like uploads)
     */
    '/((?!_next/static|_next/image|favicon.ico|uploads|public).*)',
  ],
};
