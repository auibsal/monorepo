import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@auibsal/database';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined'
    );
  }

  // Injecting the <Database> generic ensures 100% strict type safety
  // across all frontend data fetching.
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
