import 'client-only';

import type { Database } from '@auibsal/database/types';
import { createBrowserClient } from '@supabase/ssr';
import { env } from '@auibsal/env';

/**
 * createClient
 *
 * @description Standardized execution for createClient.
 */
export function createClient() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Injecting the <Database> generic ensures 100% strict type safety
  // across all frontend data fetching.
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
