import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from 'auth';

export async function proxy(request: NextRequest) {
  const { supabase, user, response } = await updateSession(request);

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  if (!user) {
    if (!isAuthPage && !isApiRoute) {
      // If unauthenticated user visits any page except /login and /register, redirect them to /login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  } else {
    if (isAuthPage) {
      // If authenticated user visits /login or /register, redirect them to /
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }

    if (!isApiRoute && user) {
        // Fetch role from custom users table
        const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

        // Pass the role to headers so we can access it in the nexus layout/pages if needed.
        // Or we just allow users in but conditionally render parts of the nexus.
        if (userData) {
            response.headers.set('x-user-role', userData.role);
        }
    }
  }

  // We no longer strictly block non-editors/admins since members have a nexus too.
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|unauthorized).*)',
  ],
};
