import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // We use the non-null assertion operator (!) to fail loudly if keys are missing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}
