import { type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { updateSession } from 'auth/proxy';

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // 1. Refresh the Supabase session and get the auth response
  const { response: authResponse } = await updateSession(request as any);

  // 2. Run the internationalization middleware to handle redirects and locale headers
  const intlResponse = intlMiddleware(request);

  // 3. CRITICAL: Merge the Supabase authentication cookies into the next-intl response
  authResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
