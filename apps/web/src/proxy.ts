import { type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { updateSession } from 'auth';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  let response = intlMiddleware(request);

  const { response: updatedResponse } = await updateSession(request, response as any);

  return updatedResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
