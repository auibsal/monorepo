import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Database } from './schema';

export const createClient = (supabaseUrl: string, supabaseKey: string) => {
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey);
};

export * from './schema';
