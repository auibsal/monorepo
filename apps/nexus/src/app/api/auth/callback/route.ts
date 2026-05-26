import { NextResponse } from 'next/server';

import { createClient } from '@auibsal/auth/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Extract the cryptographic payloads
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as any; // e.g., 'invite', 'recovery', 'magiclink'
  
  // Extract the destination, fallback to root
  let next = searchParams.get('next') || searchParams.get('redirect_to') || '/';

  // SECURITY: Open Redirect Guillotine
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('\\') || /[\s]/.test(next)) {
    next = '/';
  }

  const supabase = await createClient();

  // Vector 1: Email Template Token Hash (The Invite / Password Reset Flow)
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      // Session mathematically established, routing to destination
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Vector 2: Standard PKCE Code Exchange (Standard OAuth / Magic Links)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Session mathematically established, routing to destination
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If both cryptographic vectors fail or are missing, defect to gateway
  return NextResponse.redirect(`${origin}/login?error=invalid_auth_code`);
}
