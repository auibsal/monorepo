import { cookies } from 'next/headers';

import { createServerClient } from '@supabase/ssr';

import type { Database } from '@auibsal/database';

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined'
    );
  }

  // Injecting the <Database> generic secures all server-side queries,
  // Server Actions, and Route Handlers.
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // Next.js does not allow mutating cookies in Server Components.
          // This is safe to ignore as long as your middleware handles the token refresh.
        }
      },
    },
  });
}
