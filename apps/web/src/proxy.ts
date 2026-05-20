import { type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { updateSession } from '@auibsal/auth/proxy';

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // 1. Refresh the Supabase session and get the auth response
  const { response: authResponse } = await updateSession(request);

  // 2. Run the internationalization middleware to handle redirects and locale headers
  const intlResponse = intlMiddleware(request);

  // 3. CRITICAL SECURITY FIX: Merge the Supabase cookies while strictly preserving all security attributes
  authResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      maxAge: cookie.maxAge,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    });
  });

  return intlResponse;
}

export const config = {
  matcher: [
    // Ignore static assets, image optimization, and favicon
    '/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
