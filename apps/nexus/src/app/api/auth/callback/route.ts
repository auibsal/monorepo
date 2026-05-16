import { NextResponse } from 'next/server';
import { createClient } from 'auth/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  
  const code = searchParams.get('code');
  // "next" is a standard parameter used to track the user's intended destination
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    
    // CRITICAL: We must capture the error object
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Success! Send them to their intended destination within the Nexus dashboard
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If there was no code, or if the token exchange failed (e.g., expired link),
  // safely eject them back to the login page with an error flag.
  return NextResponse.redirect(`${origin}/login?error=invalid_auth_code`);
}
