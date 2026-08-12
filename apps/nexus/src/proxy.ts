import { updateSession } from '@auibsal/auth/proxy';
import { type NextRequest, NextResponse } from 'next/server';

// NEXT.JS REQUIREMENT: The function must be exported as the default middleware
export default async function proxy(request: NextRequest) {
  // Phase 1: Auth & Token Refresh
  const { supabase, user, response: supabaseResponse } = await updateSession(request);

  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  // Phase 2: Role Extraction & Final Routing
  const requestHeaders = new Headers(request.headers);
  // CRITICAL SECURITY: Strip any incoming role headers to prevent authorization bypass via spoofing
  requestHeaders.delete('x-user-role');

  let finalResponse: NextResponse;

  if (!user) {
    if (!isAuthPage && !isApiRoute) {
      // Unauthenticated user attempting to access a secure route
      finalResponse = NextResponse.redirect(new URL('/login', request.url));
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
      finalResponse = NextResponse.redirect(new URL('/', request.url));
    } else if (!isApiRoute) {
      // Extract the role safely
      let userRole = user.app_metadata?.role;

      if (!userRole) {
        try {
          // Warning: If user_metadata is persistently empty, this will cause Edge latency on every request.
          // Ensure your Supabase triggers inject the role into the JWT.
          const { data: userData, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (error) throw error;
          userRole = userData?.role || 'member';
        } catch (err) {
          console.error('Middleware Role Fetch Error:', err);
          userRole = 'member'; // Failsafe
        }
      }

      // Absolute fallback guarantees userRole is never undefined
      if (!userRole) userRole = 'member';

      // Inject the role into the headers
      requestHeaders.set('x-user-role', userRole);

      // Perform strict boundary RBAC redirects
      const isEditorialRoute = request.nextUrl.pathname.startsWith('/editorial');
      const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

      if (userRole === 'member' && (isEditorialRoute || isAdminRoute)) {
        finalResponse = NextResponse.redirect(new URL('/', request.url));
      } else if (userRole === 'editor' && isAdminRoute) {
        finalResponse = NextResponse.redirect(new URL('/', request.url));
      } else {
        // Build the Final Request Headers
        finalResponse = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }
    } else {
      finalResponse = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
  }

  // The Cookie Sync (Crucial Step)
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    // CRITICAL FIX: Spreading the entire cookie object ensures httpOnly, secure, and maxAge are preserved
    finalResponse.cookies.set({
      ...cookie,
    });
  });

  return finalResponse;
}

/**
 * config
 *
 * @description Standardized execution for config.
 */
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|unauthorized).*)'],
};
