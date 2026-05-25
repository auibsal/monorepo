import { NextResponse } from 'next/server';

import { createClient } from '@auibsal/auth/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get('code');
  // "next" is a standard parameter used to track the user's intended destination
  const next = searchParams.get('next') ?? '/';

  // Extract the true domain and protocol from the reverse proxy headers
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';

  // Construct a mathematically secure Base URL
  const baseUrl = forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  if (code) {
    const supabase = await createClient();

    // Exchange the PKCE code for a secure JWT session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // SECURITY: Validate 'next' to prevent DOM-based XSS and Open Redirects
      let safeNext = next;
      if (
        !safeNext.startsWith('/') ||
        safeNext.startsWith('//') ||
        safeNext.includes('\\') ||
        /[\s]/.test(safeNext)
      ) {
        safeNext = '/';
      }

      // Execute the secure proxy-aware redirect
      return NextResponse.redirect(`${baseUrl}${safeNext}`);
    }
  }

  // If there was no code, or if the token exchange failed (e.g., expired link),
  // safely eject them back to the login page with an error flag.
  return NextResponse.redirect(`${baseUrl}/login?error=invalid_auth_code`);
}
