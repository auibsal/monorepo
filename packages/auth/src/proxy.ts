import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@auibsal/database';
import type { User, AuthError, SupabaseClient } from '@supabase/supabase-js';

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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined'
    );
  }

  // Inject <Database> generic for absolute type safety
  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Update the request cookies so subsequent middleware logic sees them
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          
          // CRITICAL: Recreate the response object with the updated request headers
          supabaseResponse = NextResponse.next({
            request,
          });
          
          // Attach the new cookies to the outgoing response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 3. Fetch user and capture potential errors
  const { data: { user }, error } = await supabase.auth.getUser();

  return { supabase, user, error, response: supabaseResponse };
}
