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

  if (!user) {
    // If local dev, redirect to web on 3000, otherwise relative or environment based.
    const loginUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000/en/login'
        : `http://${request.nextUrl.host.replace(/^dashboard\./, 'web.')}/en/login`;
    return NextResponse.redirect(loginUrl);
  }

  // Fetch role from custom users table
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  // Pass the role to headers so we can access it in the dashboard layout/pages if needed.
  // Or we just allow users in but conditionally render parts of the dashboard.
  if (userData) {
      response.headers.set('x-user-role', userData.role);
  }

  // We no longer strictly block non-editors/admins since members have a dashboard too.
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login|unauthorized).*)',
  ],
};
