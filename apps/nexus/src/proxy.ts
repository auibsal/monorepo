import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@auibsal/auth/proxy';

export default async function proxy(request: NextRequest) {
  // 1. Refresh the session and grab the response (contains updated JWT cookies)
  const { supabase, user, response: authResponse } = await updateSession(request as any);

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // Create new Headers to prevent spoofing and properly pass data to Server Components
  const requestHeaders = new Headers(request.headers);
  // CRITICAL SECURITY: Strip any incoming role headers to prevent authorization bypass via spoofing
  requestHeaders.delete('x-user-role');

  let finalResponse = authResponse;

  if (!user) {
    if (!isAuthPage && !isApiRoute) {
      // Unauthenticated user attempting to access a secure route
      finalResponse = NextResponse.redirect(new URL('/login', request.url)) as any;
    } else {
      finalResponse = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  } else {
    if (isAuthPage) {
      // Authenticated user attempting to view the login page
      finalResponse = NextResponse.redirect(new URL('/', request.url)) as any;
    } else if (!isApiRoute) {
      // Safely fetch and inject the user role into the headers for downstream layouts
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData) {
        // MUST set on request headers so Server Components (via headers()) can read it
        requestHeaders.set('x-user-role', userData.role);
      }

      finalResponse = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } else {
      finalResponse = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  // 2. CRITICAL: If we triggered a redirect or a new response, we generated a brand new NextResponse.
  // We MUST copy the refreshed JWT cookies over from the Supabase response, or the user gets logged out!
  authResponse.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value);
  });

  // Also preserve other headers from authResponse if any were set by updateSession
  authResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') {
      finalResponse.headers.set(key, value);
    }
  });

  return finalResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|unauthorized).*)',
  ],
};
