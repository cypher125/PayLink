import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Helper function to safely handle string operations
const safeString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  try {
    return String(value);
  } catch {
    return '';
  }
};

// Safe includes check
const safeIncludes = (haystack: string | null | undefined, needle: string): boolean => {
  if (!haystack) return false;
  try {
    return haystack.includes(needle);
  } catch {
    return false;
  }
};

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check for tokens in multiple possible locations
  // 1. Check the 'access_token' cookie first (which we set in AuthContext)
  // 2. Then check localStorage via auth_tokens cookie as fallback
  const accessToken = request.cookies.get('access_token')?.value
  const authTokens = request.cookies.get('auth_tokens')?.value
  
  // User is authenticated if either token exists
  const isAuthenticated = !!accessToken || !!authTokens
  
  // Check if the user has set a PIN (read from pin_set cookie)
  const hasPinSet = request.cookies.get('pin_set')?.value === 'true'
  
  // Define paths that don't require authentication
  const authPaths = ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/setpin']
  const publicPaths = ['/', ...authPaths]
  
  // Check if current path is a public path or an API route
  // Using safe includes to prevent undefined errors
  const pathnameStr = safeString(pathname);
  const isPublicPath = publicPaths.includes(pathnameStr) || 
                       pathnameStr.startsWith('/api/') || 
                       safeIncludes(pathnameStr, '/_next/') ||
                       safeIncludes(pathnameStr, '/favicon.ico')
  
  // If accessing a protected route without authentication, redirect to login
  if (!isPublicPath && !isAuthenticated) {
    console.log('Redirecting to login: Not authenticated and trying to access protected route')
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }
  
  // If authenticated but PIN not set and accessing a protected route other than setpin
  if (isAuthenticated && !hasPinSet && !safeIncludes(pathnameStr, '/auth/setpin') && !isPublicPath) {
    console.log('Redirecting to set PIN: Authenticated but PIN not set')
    console.log('PIN redirection details:')
    console.log(`  - pathname: ${pathnameStr}`)
    console.log(`  - hasPinSet: ${hasPinSet}`)
    console.log(`  - isAuthenticated: ${isAuthenticated}`)
    console.log(`  - isPublicPath: ${isPublicPath}`)
    
    // Force a hard navigation to the PIN setting page to ensure it always works
    return NextResponse.redirect(new URL('/auth/setpin', request.url))
  }
  
  // If already authenticated but trying to access auth pages other than setpin (when pin not set)
  if (isAuthenticated && authPaths.some(path => pathname === path)) {
    // Allow access to setpin page if PIN is not set
    if (pathname === '/auth/setpin' && !hasPinSet) {
      return NextResponse.next()
    }
    
    console.log('Redirecting to dashboard: Already authenticated and trying to access auth route')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  return NextResponse.next()
}

// Configure which paths this middleware will run on
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!_next/static|_next/image).*)',
  ],
}
