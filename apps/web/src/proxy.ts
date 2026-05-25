import { NextRequest } from 'next/server';

import { routing } from '@/i18n/routing';
import createMiddleware from 'next-intl/middleware';

import { updateSession } from '@auibsal/auth/proxy';

const intlMiddleware = createMiddleware(routing);

// 1. Export standard 'middleware' function for Next.js to automatically intercept
export default async function proxy(request: NextRequest) {
  // =========================================================================
  // STEP 1: Cryptographic Nonce Generation (The CSP Upgrade)
  // =========================================================================
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  
  // Clone the request headers so we can securely inject the nonce for Next.js to read
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  // Initialize the request object with our new headers
  const reqWithNonce = new NextRequest(request.url, {
    headers: requestHeaders
  });

  // =========================================================================
  // STEP 2: Supabase Authentication Proxy
  // =========================================================================
  // Refresh the Supabase session using the nonce-injected request
  const { response: authResponse } = await updateSession(reqWithNonce);

  // =========================================================================
  // STEP 3: Internationalization Routing
  // =========================================================================
  // Run the internationalization middleware to handle redirects and locale headers
  const intlResponse = intlMiddleware(reqWithNonce);

  // =========================================================================
  // STEP 4: Cookie Merging (Preserving Security Attributes)
  // =========================================================================
  // CRITICAL SECURITY FIX: Merge the Supabase cookies into the outgoing i18n response
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

  // =========================================================================
  // STEP 5: Dynamic Content Security Policy Injection
  // =========================================================================
  const isDev = process.env.NODE_ENV === 'development';
  
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    connect-src 'self' *.supabase.co;
    img-src 'self' data: blob: *.supabase.co;
    frame-src 'self' *.supabase.co;
  `
    .replace(/\s{2,}/g, ' ') // Minify the header string
    .trim();

  // Attach the strictly-minted CSP to the outgoing response
  intlResponse.headers.set('Content-Security-Policy', cspHeader);

  return intlResponse;
}

export const config = {
  matcher: [
    // Ignore static assets, image optimization, and favicon
    '/((?!_next/static|_next/image|favicon.ico|\\.well-known|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
