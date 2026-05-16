import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@auibsal/auth/proxy';

export default async function proxy(request: NextRequest) {
  // 1. Refresh the session and grab the response (contains updated JWT cookies)
  const { supabase, user, response: authResponse } = await updateSession(request as any);

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // Default to returning the Supabase response
  let finalResponse = authResponse;

  if (!user) {
    if (!isAuthPage && !isApiRoute) {
      // Unauthenticated user attempting to access a secure route
      finalResponse = NextResponse.redirect(new URL('/login', request.url)) as any;//(new URL('/login', request.url));
    }
  } else {
    if (isAuthPage) {
      // Authenticated user attempting to view the login page
      finalResponse = NextResponse.redirect(new URL('/login', request.url)) as any;//(new URL('/', request.url));
    } else if (!isApiRoute) {
      // Safely fetch and inject the user role into the headers for downstream layouts
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData) {
        finalResponse.headers.set('x-user-role', userData.role);
      }
    }
  }

  // 2. CRITICAL: If we triggered a redirect, we generated a brand new NextResponse.
  // We MUST copy the refreshed JWT cookies over from the Supabase response, or the user gets logged out!
  if (finalResponse !== authResponse) {
    authResponse.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie.name, cookie.value);
    });
  }

  return finalResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|unauthorized).*)',
  ],
};
