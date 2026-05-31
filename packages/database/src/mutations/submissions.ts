import type { SupabaseClient } from '@supabase/supabase-js';
// 🛠️ CORRECTED: Importing Tables natively, removed the dead aliases import
import type { Database, Tables, TablesInsert, TablesUpdate } from '../types';

/**
 * Inserts a new manuscript submission into the database.
 */
export async function createSubmission(
  client: SupabaseClient<Database>,
  payload: TablesInsert<'submissions'>
): Promise<{ data: Tables<'submissions'> | null; error: any }> {
  return await client
    .from('submissions')
    .insert(payload)
    .select()
    .single();
}

/**
 * Updates the editorial status of a specific submission.
 */
export async function updateSubmissionStatus(
  client: SupabaseClient<Database>,
  id: string,
  status: Database['public']['Enums']['submission_status']
): Promise<{ data: Tables<'submissions'> | null; error: any }> {
  return await client
    .from('submissions')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
}
