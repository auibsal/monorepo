import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { updateSession } from 'auth';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  let response = intlMiddleware(request);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const { user, response: updatedResponse } = await updateSession(request as any, response as any, supabaseUrl, supabaseAnonKey);

  // If the user is authenticated and trying to access the web app, redirect to dashboard
  if (user) {
    const isAuthPage = request.nextUrl.pathname.includes('/login') || request.nextUrl.pathname.includes('/register');
    // If not on an auth page, or if they are but are already logged in
    if (true) {
        // Redirect to dashboard application. Locally it's port 3001
        // In production they should probably be on the same domain or have a specific ENV for dashboard url
        const dashboardUrl = process.env.NODE_ENV === 'development'
            ? 'http://localhost:3001'
            : `${request.nextUrl.protocol}//dashboard.${request.nextUrl.host.replace(/^web\./, '')}`;
        return NextResponse.redirect(dashboardUrl);
    }
  }

  return updatedResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
