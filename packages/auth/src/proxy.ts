import 'server-only';

import type { Database } from '@auibsal/database/types';

import { createServerClient } from '@supabase/ssr';
import type { AuthError, SupabaseClient, User } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { env } from '@auibsal/env';

// Explicitly type the return signature so the consuming middleware has perfect intellisense
export async function updateSession(request: NextRequest): Promise<{
  supabase: SupabaseClient<Database>;
  user: User | null;
  error: AuthError | null;
  response: NextResponse;
}> {
  // 1. Create an initial response object that forwards the request
  let supabaseResponse = NextResponse.next({
    request,
  });

  // 2. Read environment variables directly
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Inject <Database> generic for absolute type safety
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Update the request cookies so subsequent middleware logic sees them
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        // CRITICAL: Recreate the response object with the updated request headers
        supabaseResponse = NextResponse.next({
          request,
        });

        // Attach the new cookies to the outgoing response using strict Next.js object syntax
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set({ name, value, ...options });
        });
      },
    },
  });

  // 3. Fetch user and capture potential errors
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user, error, response: supabaseResponse };
}
