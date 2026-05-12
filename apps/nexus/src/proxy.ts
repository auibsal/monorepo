import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from 'auth';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const { supabase, user } = await updateSession(request as any, response as any, supabaseUrl, supabaseAnonKey);

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');

  if (!user) {
    if (!isAuthPage) {
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

  // We no longer strictly block non-editors/admins since members have a nexus too.
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|unauthorized).*)',
  ],
};
