import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import createMiddleware from 'next-intl/middleware';
import {routing} from '@/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const intlResponse = intlMiddleware(request);
  return await updateSession(request, intlResponse)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
