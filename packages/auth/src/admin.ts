import 'server-only';

import type { Database } from '@auibsal/database/types';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * createAdminClient
 *
 * @description Standardized execution for createAdminClient.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Note: We use the private server-side key, NOT the public anon key
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined',
    );
  }

  // ⚠️ DANGER: This client bypasses all Row Level Security (RLS).
  // It must ONLY be used in secure server environments (Webhooks, API Routes, Cron Jobs).
  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
