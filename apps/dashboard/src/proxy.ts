import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from 'auth';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Use the auth package's createServerClient which manages cookies correctly
  const supabase = await createServerClient(supabaseUrl, supabaseAnonKey);

  // Check user role
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Fetch role from custom users table
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData || (userData.role !== 'editor' && userData.role !== 'admin')) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|login|unauthorized).*)',
  ],
};
